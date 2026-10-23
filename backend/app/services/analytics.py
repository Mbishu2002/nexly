"""PostHog product analytics.

Server-side capture, so funnel events survive a user closing the app mid-flow
and do not depend on a client SDK being wired up on every surface.

Two rules:

- **Never block the request.** Capture is fire-and-forget; an analytics outage
  must not turn into a 500 on a booking.
- **Never send content.** Event properties carry ids, counts and enums --
  never message text, lesson notes, phone numbers or email addresses. This is
  a marketplace with minors' schooling on it, and analytics is the easiest
  place for personal data to leak out of the system unnoticed.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

# Keys that must never leave the system, whatever a caller passes.
_FORBIDDEN = {
    "text", "body", "message", "comment", "detail", "details", "note",
    "email", "phone", "password", "token", "name",
}


def _clean(properties: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in properties.items()
        if key.lower() not in _FORBIDDEN
    }


async def capture(
    distinct_id: str, event: str, properties: dict[str, Any] | None = None
) -> bool:
    """Record one event. Returns False when disabled or on failure."""
    if not settings.posthog_api_key:
        return False

    payload = {
        "api_key": settings.posthog_api_key,
        "event": event,
        "distinct_id": distinct_id,
        "properties": _clean(properties or {}),
    }

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.post(f"{settings.posthog_host}/capture/", json=payload)
        return res.status_code < 400
    except Exception:
        log.debug("posthog capture failed", exc_info=True)
        return False


def capture_soon(
    distinct_id: str, event: str, properties: dict[str, Any] | None = None
) -> None:
    """Fire-and-forget from inside a request handler.

    Schedules the call on the running loop and returns immediately; if there
    is no loop (a sync context, or tests) it quietly does nothing rather than
    raising inside whatever was being measured.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(capture(distinct_id, event, properties))
    # Hold a reference so the task is not garbage-collected mid-flight.
    _pending.add(task)
    task.add_done_callback(_pending.discard)


_pending: set[asyncio.Task] = set()
