from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.i18n import Locale
from app.models import Block, ChatMessage, Thread as ThreadRow
from app.models import User
from app.schemas import Message, SendMessageIn, Thread

router = APIRouter(prefix="/me/threads", tags=["messaging"])


def _clock(when: datetime, tz: str, locale: Locale) -> str:
    local = when.astimezone(ZoneInfo(tz))
    today = datetime.now(ZoneInfo(tz)).date()
    if local.date() == today:
        return local.strftime("%H:%M")
    if (today - local.date()).days == 1:
        return "Hier" if locale == "fr" else "Yesterday"
    return local.strftime("%d/%m")


def _to_thread(row: ThreadRow, user: User, locale: Locale) -> Thread:
    tz = user.timezone
    messages = [
        Message(
            from_="me" if m.sender_id == user.id else "them",
            text=m.body,
            time=_clock(m.sent_at, tz, locale),
        )
        for m in row.messages
    ]
    unread = sum(1 for m in row.messages if m.sender_id != user.id and m.read_at is None)
    last = row.messages[-1] if row.messages else None

    return Thread(
        id=row.id,
        teacherId=row.teacher_id,
        name=row.teacher.name if row.teacher else "",
        avatar=row.teacher.avatar_url if row.teacher else None,
        preview=last.body if last else "",
        time=_clock(last.sent_at, tz, locale) if last else "",
        unread=unread,
        messages=messages,
    )


@router.get("", response_model=list[Thread])
def list_threads(db: DbSession, user: CurrentUser, locale: ReqLocale) -> list[Thread]:
    rows = db.execute(
        select(ThreadRow).where(ThreadRow.student_id == user.id)
    ).scalars().all()
    threads = [_to_thread(r, user, locale) for r in rows]
    # Most recently active first.
    threads.sort(key=lambda t: t.time, reverse=True)
    return threads


@router.get("/{thread_id}", response_model=Thread)
def get_thread(thread_id: str, db: DbSession, user: CurrentUser, locale: ReqLocale) -> Thread:
    row = db.get(ThreadRow, thread_id)
    if row is None or row.student_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Thread not found")

    # Opening a thread marks the other side's messages read.
    for m in row.messages:
        if m.sender_id != user.id and m.read_at is None:
            m.read_at = datetime.now(UTC)
    db.commit()

    return _to_thread(row, user, locale)


@router.post("/{thread_id}/messages", response_model=Thread, status_code=status.HTTP_201_CREATED)
def send_message(
    thread_id: str,
    body: SendMessageIn,
    db: DbSession,
    user: CurrentUser,
    locale: ReqLocale,
) -> Thread:
    row = db.get(ThreadRow, thread_id)
    if row is None or row.student_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Thread not found")

    # A block must stop delivery in both directions, not just hide the thread.
    other_user_id = row.teacher.user_id if row.teacher else None
    if other_user_id:
        blocked = db.query(Block).filter(
            ((Block.blocker_id == user.id) & (Block.blocked_id == other_user_id))
            | ((Block.blocker_id == other_user_id) & (Block.blocked_id == user.id))
        ).first()
        if blocked:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Messaging is blocked")

    db.add(ChatMessage(thread_id=row.id, sender_id=user.id, body=body.text))
    db.commit()
    db.refresh(row)
    return _to_thread(row, user, locale)
