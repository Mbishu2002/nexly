"""Group sessions.

A group lesson is a `Lesson` with `capacity > 1`; its roster lives in
`LessonParticipant` rather than the single `student_id` a one-to-one lesson
uses. The architecture plan caps MVP group size (`MAX_GROUP_SIZE`, default 6);
anything larger is Phase 2 and is refused here rather than silently allowed.
"""

from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.config import settings
from app.core.i18n import pick
from app.models import Lesson, LessonParticipant
from app.schemas import GroupSessionOut, JoinGroupOut

router = APIRouter(prefix="/group-sessions", tags=["group sessions"])


def _seats_taken(db: DbSession, lesson_id: str) -> int:
    return (
        db.query(func.count(LessonParticipant.id))
        .filter(
            LessonParticipant.lesson_id == lesson_id,
            LessonParticipant.state.in_(("booked", "attended")),
        )
        .scalar()
        or 0
    )


@router.get("", response_model=list[GroupSessionOut])
def list_group_sessions(
    db: DbSession, user: CurrentUser, locale: ReqLocale
) -> list[GroupSessionOut]:
    now = datetime.now(UTC)
    rows = (
        db.query(Lesson)
        .filter(
            Lesson.capacity > 1,
            Lesson.starts_at >= now,
            Lesson.status.in_(("confirmed", "pending")),
        )
        .order_by(Lesson.starts_at)
        .all()
    )

    tz = ZoneInfo(user.timezone)
    mine = {
        p.lesson_id
        for p in db.query(LessonParticipant)
        .filter(
            LessonParticipant.user_id == user.id,
            LessonParticipant.state.in_(("booked", "attended")),
        )
        .all()
    }

    out: list[GroupSessionOut] = []
    for lesson in rows:
        taken = _seats_taken(db, lesson.id)
        local = lesson.starts_at.astimezone(tz)
        out.append(
            GroupSessionOut(
                id=lesson.id,
                topic=pick(lesson, "topic", locale),
                teacher=lesson.teacher.name if lesson.teacher else "",
                teacherId=lesson.teacher_id,
                date=local.date().isoformat(),
                time=local.strftime("%H:%M"),
                tz=user.timezone,
                duration=lesson.duration_minutes,
                capacity=lesson.capacity,
                booked=taken,
                seatsLeft=max(0, lesson.capacity - taken),
                joined=lesson.id in mine,
            )
        )
    return out


@router.post("/{lesson_id}/join", response_model=JoinGroupOut, status_code=201)
def join_group_session(
    lesson_id: str, db: DbSession, user: CurrentUser
) -> JoinGroupOut:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None or lesson.capacity <= 1:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group session not found")
    if lesson.capacity > settings.max_group_size:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Group size above the current cap of {settings.max_group_size}",
        )
    if lesson.starts_at <= datetime.now(UTC):
        raise HTTPException(status.HTTP_409_CONFLICT, "That session has already started")

    existing = (
        db.query(LessonParticipant)
        .filter(
            LessonParticipant.lesson_id == lesson.id,
            LessonParticipant.user_id == user.id,
        )
        .one_or_none()
    )
    if existing and existing.state in {"booked", "attended"}:
        raise HTTPException(status.HTTP_409_CONFLICT, "You are already on this session")

    # Lock the roster before counting, or two learners racing for the last
    # seat both read "one left" and both get in.
    db.query(LessonParticipant).filter(
        LessonParticipant.lesson_id == lesson.id
    ).with_for_update().all()

    if _seats_taken(db, lesson.id) >= lesson.capacity:
        raise HTTPException(status.HTTP_409_CONFLICT, "This session is full")

    if user.pass_credits < 1:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "No Pass credits remaining")

    if existing:
        existing.state = "booked"
    else:
        db.add(LessonParticipant(lesson_id=lesson.id, user_id=user.id, state="booked"))

    user.pass_credits -= 1
    db.commit()

    return JoinGroupOut(
        id=lesson.id, seatsLeft=max(0, lesson.capacity - _seats_taken(db, lesson.id))
    )


@router.post("/{lesson_id}/leave", response_model=JoinGroupOut)
def leave_group_session(
    lesson_id: str, db: DbSession, user: CurrentUser
) -> JoinGroupOut:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None or lesson.capacity <= 1:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group session not found")

    row = (
        db.query(LessonParticipant)
        .filter(
            LessonParticipant.lesson_id == lesson.id,
            LessonParticipant.user_id == user.id,
            LessonParticipant.state == "booked",
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not on this session")

    row.state = "cancelled"
    # Refund the credit only while cancellation is still free.
    if lesson.starts_at > datetime.now(UTC):
        user.pass_credits += 1
    db.commit()

    return JoinGroupOut(
        id=lesson.id, seatsLeft=max(0, lesson.capacity - _seats_taken(db, lesson.id))
    )
