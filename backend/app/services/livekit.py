"""LiveKit access tokens for the live classroom.

A LiveKit join token is a JWT signed with the project's API secret, carrying a
`video` grant that names the room and what the holder may do in it. We mint it
here rather than pulling in the SDK, because signing is the only server-side
operation the booking flow needs.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from jose import jwt

from app.core.config import settings


class LiveKitNotConfigured(RuntimeError):
    pass


def room_name_for_lesson(lesson_id: str) -> str:
    return f"lesson-{lesson_id}"


def create_join_token(
    *,
    room: str,
    identity: str,
    display_name: str,
    can_publish: bool = True,
    ttl_minutes: int = 120,
) -> str:
    if not settings.livekit_api_key or not settings.livekit_api_secret:
        raise LiveKitNotConfigured("LIVEKIT_API_KEY / LIVEKIT_API_SECRET are not set")

    now = datetime.now(UTC)
    claims = {
        "iss": settings.livekit_api_key,
        "sub": identity,
        "name": display_name,
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl_minutes)).timestamp()),
        "video": {
            "room": room,
            "roomJoin": True,
            "canPublish": can_publish,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }
    return jwt.encode(claims, settings.livekit_api_secret, algorithm="HS256")
