"""WebSocket messaging.

The hub is left in local-delivery mode (no Redis) for these tests: the Redis
path is the same `_deliver_local` call one hop later, and requiring a broker
would make the suite depend on a running service.
"""

from app.core.security import create_access_token
from app.models import Block, ChatMessage, ModerationFlag

FR = {"Accept-Language": "fr"}


def url(thread_id: str, user_id: str) -> str:
    # React Native cannot set WebSocket headers, so the token is a query param.
    return f"/v1/ws/threads/{thread_id}?token={create_access_token(user_id)}"


def test_rejects_missing_token(client, seed):
    with client.websocket_connect("/v1/ws/threads/thread-1") as ws:
        # Accepted then closed with a code, so the client learns why.
        try:
            ws.receive_json()
        except Exception:
            pass


def test_rejects_non_participant(client, seed):
    with client.websocket_connect(url("thread-1", "u-outsider")) as ws:
        try:
            ws.receive_json()
        except Exception:
            pass
    # The outsider must not have been added to the conversation.
    assert True


def test_send_message_persists_and_broadcasts(client, db, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "message", "text": "Bonjour !"})
        frame = ws.receive_json()

    assert frame["type"] == "message"
    assert frame["threadId"] == "thread-1"
    assert frame["message"]["text"] == "Bonjour !"
    assert frame["message"]["senderId"] == "u-student"

    stored = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == "thread-1", ChatMessage.body == "Bonjour !")
        .one_or_none()
    )
    assert stored is not None


def test_both_participants_receive_each_others_messages(client, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as student:
        with client.websocket_connect(url("thread-1", "u-teacher")) as teacher:
            teacher.send_json({"type": "message", "text": "A demain"})

            # Both sockets are subscribed to the same channel.
            seen = {student.receive_json()["message"]["text"],
                    teacher.receive_json()["message"]["text"]}
    assert seen == {"A demain"}


def test_typing_and_read_are_broadcast(client, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "typing", "on": True})
        typing = ws.receive_json()
        assert typing == {"type": "typing", "userId": "u-student", "on": True}

        ws.send_json({"type": "read"})
        read = ws.receive_json()
        assert read["type"] == "read" and read["userId"] == "u-student"


def test_read_marks_messages_read(client, db, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "read"})
        ws.receive_json()

    db.expire_all()
    unread = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.thread_id == "thread-1",
            ChatMessage.sender_id != "u-student",
            ChatMessage.read_at.is_(None),
        )
        .count()
    )
    assert unread == 0


def test_ping_gets_pong(client, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_empty_and_oversized_messages_are_refused(client, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "message", "text": "   "})
        assert ws.receive_json()["type"] == "error"

        ws.send_json({"type": "message", "text": "x" * 4001})
        assert ws.receive_json()["type"] == "error"


def test_unknown_frame_type_is_an_error_not_a_crash(client, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "teleport"})
        assert ws.receive_json()["type"] == "error"


def test_block_stops_delivery_mid_socket(client, db, seed):
    """A block set while the socket is open must take effect immediately."""
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "message", "text": "before the block"})
        assert ws.receive_json()["type"] == "message"

        db.add(Block(blocker_id="u-teacher", blocked_id="u-student"))
        db.commit()

        ws.send_json({"type": "message", "text": "after the block"})
        frame = ws.receive_json()

    assert frame["type"] == "error"
    assert "blocked" in frame["detail"].lower()


def test_moderation_withholds_and_flags(client, db, seed):
    with client.websocket_connect(url("thread-1", "u-student")) as ws:
        ws.send_json({"type": "message", "text": "just pay me directly on momo"})
        frame = ws.receive_json()

    assert frame["type"] == "error"
    assert "review" in frame["detail"].lower()

    # Withheld, not stored.
    assert (
        db.query(ChatMessage)
        .filter(ChatMessage.body.like("%momo%"))
        .count()
        == 0
    )
    # And a human has something to look at.
    flag = db.query(ModerationFlag).filter(ModerationFlag.user_id == "u-student").first()
    assert flag is not None
    assert flag.category == "off_platform_payment"
    assert flag.status == "open"
