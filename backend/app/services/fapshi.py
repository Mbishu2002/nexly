"""Fapshi mobile-money client.

Reached only from the WEB checkout flow and the webhook. The mobile apps never
call these endpoints, never see a price, and never link to a payment page --
that is what keeps the iOS build outside Apple's in-app purchase rules
(architecture plan, section 6).

Fapshi authenticates with an `apiuser` / `apikey` header pair rather than a
bearer token.
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

import httpx

from app.core.config import settings


class FapshiError(RuntimeError):
    pass


def _headers() -> dict[str, str]:
    return {
        "apiuser": settings.fapshi_api_user,
        "apikey": settings.fapshi_api_key,
        "Content-Type": "application/json",
    }


async def initiate_payment(
    *,
    amount_xaf: int,
    phone: str,
    email: str,
    external_id: str,
    redirect_url: str | None = None,
) -> dict[str, Any]:
    """Create a payment and return Fapshi's `{transId, link, ...}`.

    `external_id` is our own Payment row id, echoed back on the webhook so a
    callback can be matched to a purchase without trusting the amount.
    """
    if not settings.fapshi_api_key:
        raise FapshiError("FAPSHI_API_KEY is not configured")

    payload: dict[str, Any] = {
        "amount": amount_xaf,
        "phone": phone,
        "email": email,
        "externalId": external_id,
        "message": "Nexly lesson package",
    }
    if redirect_url:
        payload["redirectUrl"] = redirect_url

    async with httpx.AsyncClient(base_url=settings.fapshi_base_url, timeout=30) as client:
        res = await client.post("/initiate-pay", json=payload, headers=_headers())

    if res.status_code >= 400:
        raise FapshiError(f"Fapshi returned {res.status_code}: {res.text}")
    return res.json()


async def get_payment_status(trans_id: str) -> dict[str, Any]:
    """Authoritative status lookup.

    Always call this from the webhook instead of trusting the POSTed body:
    the callback is just a nudge telling us something changed.
    """
    async with httpx.AsyncClient(base_url=settings.fapshi_base_url, timeout=30) as client:
        res = await client.get(f"/payment-status/{trans_id}", headers=_headers())

    if res.status_code >= 400:
        raise FapshiError(f"Fapshi returned {res.status_code}: {res.text}")
    return res.json()


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
    """Constant-time HMAC check on the raw request body.

    Returns True when no secret is configured so local development works, but
    `app.api.v1.routes.payments` refuses that shortcut outside `env=local`.
    """
    if not settings.fapshi_webhook_secret:
        return True
    if not signature:
        return False

    expected = hmac.new(
        settings.fapshi_webhook_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
