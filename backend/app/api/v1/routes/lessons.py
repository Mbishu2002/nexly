from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.i18n import Locale, pick
from app.models import Lesson as LessonRow
from app.models import User
from app.schemas import Lesson, LessonDetail, LessonMaterial, RescheduleIn, RescheduleOut

router = APIRouter(prefix="/me/lessons", tags=["lessons"])

# The classroom unlocks shortly before the start time; the client shows a
# countdown until then rather than a dead Join button.
JOIN_WINDOW = timedelta(minutes=10)

_POLICY = {
    "fr": (
        "Annulation gratuite jusqu'à 4 h avant le début. "
        "Au-delà, le crédit Pass est décompté."
    ),
    "en": (
        "Free cancellation up to 4 h before the start. "
        "After that, the Pass credit is used."
    ),
}


def _local(dt: datetime, tz: str) -> datetime:
    return dt.astimezone(ZoneInfo(tz))


def _humanise_date(when: datetime, tz: str, locale: Locale) -> str:
    """'Today' / 'Thursday 25 Sept', in the viewer's own timezone."""
    local = _local(when, tz)
    today = datetime.now(ZoneInfo(tz)).date()
    delta = (local.date() - today).days

    if delta == 0:
        return "Aujourd'hui" if locale == "fr" else "Today"
    if delta == 1:
        return "Demain" if locale == "fr" else "Tomorrow"

    if locale == "fr":
        days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
        months = [
            "janv.", "févr.", "mars", "avr.", "mai", "juin",
            "juil.", "août", "sept.", "oct.", "nov.", "déc.",
        ]
        return f"{days[local.weekday()].capitalize()} {local.day} {months[local.month - 1]}"

    return local.strftime("%A %-d %b") if hasattr(local, "strftime") else local.isoformat()


def _countdown(when: datetime, tz: str, locale: Locale) -> str:
    delta = when - datetime.now(UTC)
    if delta <= JOIN_WINDOW:
        return "Commence bientôt" if locale == "fr" else "Starting soon"
    days = delta.days
    if days >= 1:
        return f"Dans {days} jour{'s' if days > 1 else ''}" if locale == "fr" else (
            f"In {days} day{'s' if days > 1 else ''}"
        )
    hours = max(1, delta.seconds // 3600)
    return f"Dans {hours} h" if locale == "fr" else f"In {hours} h"


@router.get("", response_model=list[Lesson])
def list_upcoming(
    db: DbSession,
    user: CurrentUser,
    locale: ReqLocale,
    status_filter: str = Query(default="upcoming", alias="status"),
) -> list[Lesson]:
    stmt = db.query(LessonRow).filter(LessonRow.student_id == user.id)

    if status_filter == "upcoming":
        stmt = stmt.filter(
            LessonRow.starts_at >= datetime.now(UTC),
            LessonRow.status.in_(("confirmed", "pending")),
        )
    elif status_filter != "all":
        stmt = stmt.filter(LessonRow.status == status_filter)

    rows = stmt.order_by(LessonRow.starts_at).all()
    tz = user.timezone

    return [
        Lesson(
            id=r.id,
            teacher=r.teacher.name,
            teacherId=r.teacher_id,
            avatar=r.teacher.avatar_url,
            topic=pick(r, "topic", locale),
            date=_humanise_date(r.starts_at, tz, locale),
            time=_local(r.starts_at, tz).strftime("%H:%M"),
            tz=tz,
            duration=r.duration_minutes,
        )
        for r in rows
    ]


@router.post("/reschedule", response_model=RescheduleOut)
def request_reschedule(
    body: RescheduleIn, db: DbSession, user: CurrentUser, locale: ReqLocale
) -> RescheduleOut:
    # Declared before /{lesson_id} so "reschedule" is not read as an id.
    lesson = db.get(LessonRow, body.lessonId)
    if lesson is None or lesson.student_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")

    lesson.status = "pending"
    db.commit()

    return RescheduleOut(
        ref=f"RS-{lesson.id[:8].upper()}",
        message=(
            "Demande envoyée. L'enseignant proposera de nouveaux créneaux."
            if locale == "fr"
            else "Request sent. Your teacher will propose new slots."
        ),
    )


@router.get("/{lesson_id}", response_model=LessonDetail)
def get_lesson(
    lesson_id: str, db: DbSession, user: CurrentUser, locale: ReqLocale
) -> LessonDetail:
    r = db.get(LessonRow, lesson_id)
    if r is None or r.student_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")

    tz = user.timezone
    start = _local(r.starts_at, tz)
    end = start + timedelta(minutes=r.duration_minutes)
    objectives = r.objectives_fr if locale == "fr" else r.objectives_en

    return LessonDetail(
        id=r.id,
        topic=pick(r, "topic", locale),
        cover=r.cover_url,
        teacher=r.teacher.name,
        teacherId=r.teacher_id,
        avatar=r.teacher.avatar_url,
        teacherHeadline=pick(r.teacher, "headline", locale),
        date=_humanise_date(r.starts_at, tz, locale),
        time=start.strftime("%H:%M"),
        endTime=end.strftime("%H:%M"),
        tz=tz,
        duration=r.duration_minutes,
        status=r.status,
        statusLabel=_status_label(r.status, locale),
        language=pick(r, "language", locale),
        level=pick(r, "level", locale),
        lessonType=pick(r, "lesson_type", locale),
        joinable=(r.starts_at - datetime.now(UTC)) <= JOIN_WINDOW and r.status == "confirmed",
        countdown=_countdown(r.starts_at, tz, locale),
        objectives=list(objectives or []),
        materials=[
            LessonMaterial(
                id=m["id"],
                label=m.get(f"label_{locale}", ""),
                meta=m.get(f"meta_{locale}", ""),
                icon=m.get("icon", "description"),
            )
            for m in (r.materials or [])
        ],
        teacherNote=pick(r, "teacher_note", locale),
        policy=_POLICY[locale],
    )


def _status_label(status_value: str, locale: Locale) -> str:
    labels = {
        "confirmed": ("Confirmée", "Confirmed"),
        "pending": ("En attente", "Pending"),
        "completed": ("Terminée", "Completed"),
        "cancelled": ("Annulée", "Cancelled"),
    }
    fr, en = labels.get(status_value, (status_value, status_value))
    return fr if locale == "fr" else en


__all__ = ["router", "User"]
