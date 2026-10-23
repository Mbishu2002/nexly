"""WebSocket endpoint for live messaging.

Protocol, client -> server:
    {"type": "message", "text": "..."}     send a message
    {"type": "typing",  "on": true}        typing indicator
    {"type": "read"}                       mark the thread read
    {"type": "ping"}                       keepalive

Server -> client:
    {"type": "message", "message": {...}, "threadId": "..."}
    {"type": "typing",  "userId": "...", "on": true}
    {"type": "read",    "userId": "...", "at": "..."}
    {"type": "error",   "detail": "..."}
    {"type": "pong"}

Auth is a `?token=` query parameter rather than a header: React Native's
WebSocket cannot set headers, so the usual Authorization header is unavailable.
The token is the same short-lived JWT the REST API uses.

Sessions are opened per frame, not held for the life of the socket. A chat
connection can stay open for an hour; holding a pooled connection that long
would let a few hundred idle sockets exhaust the database.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from contextlib import contextmanager
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models import Block, ChatMessage, Thread, User
from app.services import moderation
from app.services.realtime import channel_for_thread, hub

log = logging.getLogger(__name__)

router = APIRouter(tags=["realtime"])

# Close codes. 4401/4403/4404 are application codes in the private range.
WS_UNAUTHORIZED = 4401
WS_FORBIDDEN = 4403
WS_NOT_FOUND = 4404

SessionFactory = Callable[[], Session]


def get_session_factory() -> SessionFactory:
    """Indirection so tests can point sockets at the test database.

    A WebSocket route cannot use the request-scoped `get_db` dependency
    sensibly -- that would tie one connection to the whole socket -- so the
    factory is injected instead and each frame opens its own session.
    """
    return SessionLocal


@contextmanager
def _session(factory: SessionFactory):
    db = factory()
    try:
        yield db
    finally:
        db.close()


def _participants(thread: Thread) -> set[str]:
    ids = {thread.student_id}
    if thread.teacher:
        ids.add(thread.teacher.user_id)
    return ids


def _is_blocked(db: Session, a: str, b: str) -> bool:
    return (
        db.query(Block)
        .filter(
            ((Block.blocker_id == a) & (Block.blocked_id == b))
            | ((Block.blocker_id == b) & (Block.blocked_id == a))
        )
        .first()
        is not None
    )


@router.websocket("/ws/threads/{thread_id}")
async def thread_socket(
    websocket: WebSocket,
    thread_id: str,
    token: str | None = Query(default=None),
    factory: SessionFactory = Depends(get_session_factory),
) -> None:
    channel = channel_for_thread(thread_id)
    joined = False

    # --- handshake: authenticate and authorise before accepting frames ---
    with _session(factory) as db:
        payload = decode_access_token(token) if token else None
        user = db.get(User, payload["sub"]) if payload and payload.get("sub") else None
        if user is None or user.is_suspended:
            # Accept then close with a code, so the client learns *why*
            # instead of seeing a bare handshake failure.
            await websocket.accept()
            await websocket.close(code=WS_UNAUTHORIZED, reason="Not authenticated")
            return

        thread = db.get(Thread, thread_id)
        if thread is None:
            await websocket.accept()
            await websocket.close(code=WS_NOT_FOUND, reason="Thread not found")
            return

        member_ids = _participants(thread)
        if user.id not in member_ids:
            await websocket.accept()
            await websocket.close(code=WS_FORBIDDEN, reason="Not a participant")
            return

        user_id = user.id
        user_name = user.name
        other_id = next((uid for uid in member_ids if uid != user_id), None)

    await websocket.accept()
    await hub.subscribe(channel, websocket)
    joined = True

    try:
        while True:
            payload = await websocket.receive_json()
            kind = payload.get("type")

            if kind == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if kind == "typing":
                await hub.publish(
                    channel,
                    {"type": "typing", "userId": user_id, "on": bool(payload.get("on"))},
                )
                continue

            if kind == "read":
                now = datetime.now(UTC)
                with _session(factory) as db:
                    thread = db.get(Thread, thread_id)
                    if thread is not None:
                        for message in thread.messages:
                            if message.sender_id != user_id and message.read_at is None:
                                message.read_at = now
                        db.commit()
                await hub.publish(
                    channel, {"type": "read", "userId": user_id, "at": now.isoformat()}
                )
                continue

            if kind == "message":
                await _handle_message(
                    websocket, factory, channel, thread_id, user_id, user_name,
                    other_id, payload,
                )
                continue

            await websocket.send_json({"type": "error", "detail": f"Unknown type: {kind}"})

    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("websocket error on thread %s", thread_id)
    finally:
        if joined:
            await hub.unsubscribe(channel, websocket)


async def _handle_message(
    websocket: WebSocket,
    factory: SessionFactory,
    channel: str,
    thread_id: str,
    user_id: str,
    user_name: str,
    other_id: str | None,
    payload: dict,
) -> None:
    text = (payload.get("text") or "").strip()
    if not text:
        await websocket.send_json({"type": "error", "detail": "Empty message"})
        return
    if len(text) > 4000:
        await websocket.send_json({"type": "error", "detail": "Message too long"})
        return

    with _session(factory) as db:
        # A block stops delivery in both directions. Checked per message, not
        # at connect: it can be set while a socket is open.
        if other_id and _is_blocked(db, user_id, other_id):
            await websocket.send_json({"type": "error", "detail": "Messaging is blocked"})
            return

        verdict = moderation.classify_text(text)
        if verdict.blocked:
            moderation.record_flag(
                db,
                subject_type="message",
                subject_id=thread_id,
                user_id=user_id,
                verdict=verdict,
            )
            db.commit()
            await websocket.send_json(
                {"type": "error", "detail": "Message withheld for review"}
            )
            return

        message = ChatMessage(thread_id=thread_id, sender_id=user_id, body=text)
        db.add(message)
        db.commit()
        db.refresh(message)

        if verdict.flagged:
            moderation.record_flag(
                db,
                subject_type="message",
                subject_id=message.id,
                user_id=user_id,
                verdict=verdict,
            )
            db.commit()

        frame = {
            "type": "message",
            "threadId": thread_id,
            "message": {
                "id": message.id,
                "senderId": user_id,
                "text": message.body,
                "sentAt": message.sent_at.isoformat(),
            },
        }

    await hub.publish(channel, frame)

    # Nudge the other side if they are not watching. Queued rather than sent
    # inline so a slow FCM call cannot stall the socket.
    if other_id:
        await _queue_message_push(other_id, user_name, text, thread_id)


async def _queue_message_push(user_id: str, sender: str, text: str, thread_id: str) -> None:
    """Hand the push to Arq. Never raises: a notification is not worth the socket."""
    try:
        from app.worker import enqueue

        await enqueue(
            "send_message_push",
            user_id=user_id,
            sender_name=sender,
            preview=text[:120],
            thread_id=thread_id,
        )
    except Exception:
        log.debug("could not queue message push", exc_info=True)
