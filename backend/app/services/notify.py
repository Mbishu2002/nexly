"""Outbound notifications: Resend for email, FCM for push.

Both senders are deliberately forgiving. A failed notification must never
break the thing that triggered it -- a booking is still a booking if the
confirmation email bounces -- so they return a result instead of raising, and
the caller logs it.

De-duplication lives in `NotificationLog`: the worker asks `already_sent`
before sending, which makes a re-run of a cron job harmless rather than a
second buzz on someone's phone at 6am.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DeviceToken, NotificationLog

log = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"
FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"


@dataclass(frozen=True)
class SendResult:
    ok: bool
    detail: str = ""
    skipped: bool = False


# --------------------------------------------------------------------------
# De-duplication
# --------------------------------------------------------------------------


def already_sent(db: Session, *, user_id: str, kind: str, dedupe_key: str) -> bool:
    return (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == user_id,
            NotificationLog.kind == kind,
            NotificationLog.dedupe_key == dedupe_key,
        )
        .first()
        is not None
    )


def record(
    db: Session,
    *,
    user_id: str,
    kind: str,
    dedupe_key: str,
    channel: str,
    status: str,
    detail: str = "",
) -> None:
    db.add(
        NotificationLog(
            user_id=user_id,
            kind=kind,
            dedupe_key=dedupe_key,
            channel=channel,
            status=status,
            detail=detail[:1000],
        )
    )


# --------------------------------------------------------------------------
# Email (Resend)
# --------------------------------------------------------------------------


async def send_email(*, to: str, subject: str, html: str, text: str = "") -> SendResult:
    if not settings.resend_api_key:
        log.info("RESEND_API_KEY unset; would email %s: %s", to, subject)
        return SendResult(ok=False, skipped=True, detail="Resend not configured")

    payload = {
        "from": settings.email_from,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                RESEND_URL,
                json=payload,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            )
        if res.status_code >= 400:
            return SendResult(ok=False, detail=f"{res.status_code}: {res.text[:300]}")
        return SendResult(ok=True, detail=res.json().get("id", ""))
    except Exception as exc:
        return SendResult(ok=False, detail=str(exc)[:300])


# --------------------------------------------------------------------------
# Push (Firebase Cloud Messaging, HTTP v1)
# --------------------------------------------------------------------------

_token_cache: tuple[float, str] | None = None


def _service_account() -> dict | None:
    if not settings.fcm_credentials_file:
        return None
    path = Path(settings.fcm_credentials_file)
    if not path.is_file():
        log.warning("FCM credentials file not found: %s", path)
        return None
    return json.loads(path.read_text(encoding="utf-8"))


async def _access_token() -> str | None:
    """Exchange the service-account key for an OAuth token, cached until expiry."""
    global _token_cache
    if _token_cache and _token_cache[0] > time.time() + 60:
        return _token_cache[1]

    account = _service_account()
    if not account:
        return None

    from jose import jwt

    now = int(time.time())
    assertion = jwt.encode(
        {
            "iss": account["client_email"],
            "scope": FCM_SCOPE,
            "aud": account["token_uri"],
            "iat": now,
            "exp": now + 3600,
        },
        account["private_key"],
        algorithm="RS256",
    )

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                account["token_uri"],
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
            )
        res.raise_for_status()
        body = res.json()
    except Exception:
        log.warning("could not mint FCM access token", exc_info=True)
        return None

    token = body["access_token"]
    _token_cache = (time.time() + int(body.get("expires_in", 3600)), token)
    return token


async def send_push(
    db: Session,
    *,
    user_id: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> SendResult:
    """Push to every live device for a user.

    Tokens FCM rejects as UNREGISTERED are deactivated rather than deleted, so
    the history of a device stays visible.
    """
    tokens = (
        db.query(DeviceToken)
        .filter(DeviceToken.user_id == user_id, DeviceToken.is_active.is_(True))
        .all()
    )
    if not tokens:
        return SendResult(ok=False, skipped=True, detail="No registered devices")

    access = await _access_token()
    if not access or not settings.fcm_project_id:
        log.info("FCM unset; would push to %s: %s", user_id, title)
        return SendResult(ok=False, skipped=True, detail="FCM not configured")

    url = (
        f"https://fcm.googleapis.com/v1/projects/{settings.fcm_project_id}/messages:send"
    )
    sent = 0
    errors: list[str] = []

    async with httpx.AsyncClient(timeout=15) as client:
        for device in tokens:
            message = {
                "message": {
                    "token": device.token,
                    "notification": {"title": title, "body": body},
                    "data": {k: str(v) for k, v in (data or {}).items()},
                }
            }
            try:
                res = await client.post(
                    url, json=message, headers={"Authorization": f"Bearer {access}"}
                )
            except Exception as exc:
                errors.append(str(exc)[:120])
                continue

            if res.status_code < 400:
                sent += 1
                continue

            detail = res.text[:300]
            errors.append(detail)
            if "UNREGISTERED" in detail or "InvalidRegistration" in detail:
                device.is_active = False

    if sent:
        return SendResult(ok=True, detail=f"sent to {sent}/{len(tokens)} devices")
    return SendResult(ok=False, detail="; ".join(errors)[:300])
