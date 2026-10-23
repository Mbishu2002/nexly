"""Availability, lesson formats, and creating a booking.

Booking spends a Pass credit bought on the web. No price appears anywhere in
these responses -- see the architecture plan, section 6.
"""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status

from app import catalog
from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.catalog import t
from app.core.config import settings
from app.core.i18n import Locale
from app.models import AvailabilitySlot, LedgerEntry, Lesson, Teacher, Thread
from app.schemas import CreateBookingIn, CreatedBooking, DaySlots, LessonType

router = APIRouter(tags=["booking"])

_DAY_NAMES = {
    "fr": ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
    "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
}


def day_label(d: datetime, locale: Locale) -> str:
    return _DAY_NAMES[locale][d.weekday()].capitalize()


@router.get("/lesson-types", response_model=list[LessonType])
def list_lesson_types(locale: ReqLocale) -> list[LessonType]:
    return [
        LessonType(
            id=lt["id"],
            label=t(lt["label"], locale),
            duration=lt["duration"],
            note=t(lt["note"], locale),
        )
        for lt in catalog.LESSON_TYPES
    ]


@router.get("/teachers/{teacher_id}/availability", response_model=list[DaySlots])
def get_availability(teacher_id: str, db: DbSession, locale: ReqLocale) -> list[DaySlots]:
    """Free slots for the next fortnight, grouped by day."""
    today = datetime.now(UTC).date()
    horizon = today + timedelta(days=14)

    rows = (
        db.query(AvailabilitySlot)
        .filter(
            AvailabilitySlot.teacher_id == teacher_id,
            AvailabilitySlot.state == "free",
            AvailabilitySlot.day >= today,
            AvailabilitySlot.day <= horizon,
        )
        .order_by(AvailabilitySlot.day, AvailabilitySlot.start_time)
        .all()
    )

    grouped: dict[str, list[str]] = {}
    for slot in rows:
        grouped.setdefault(slot.day.isoformat(), []).append(slot.start_time.strftime("%H:%M"))

    return [
        DaySlots(
            day=day_label(datetime.fromisoformat(day), locale),
            date=day,
            slots=times,
        )
        for day, times in sorted(grouped.items())
    ]


@router.post("/bookings", response_model=CreatedBooking, status_code=status.HTTP_201_CREATED)
def create_booking(
    body: CreateBookingIn, db: DbSession, user: CurrentUser, locale: ReqLocale
) -> CreatedBooking:
    teacher = db.get(Teacher, body.teacherId)
    if teacher is None or not teacher.is_published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Teacher not found")

    lesson_type = next((lt for lt in catalog.LESSON_TYPES if lt["id"] == body.type), None)
    if lesson_type is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown lesson type")

    if user.pass_credits < 1:
        # The app must not offer a way to buy more, so this says what happened
        # and nothing else. Topping up is a web journey.
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "No Pass credits remaining")

    try:
        starts_naive = datetime.fromisoformat(f"{body.date}T{body.slot}")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid date or slot") from exc
    starts_at = starts_naive.replace(tzinfo=ZoneInfo(user.timezone)).astimezone(UTC)

    if starts_at <= datetime.now(UTC):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That slot is in the past")

    # Claim the slot. Re-checking `state` here is what stops two learners
    # booking the same slot: whoever commits first leaves it non-free.
    slot = (
        db.query(AvailabilitySlot)
        .filter(
            AvailabilitySlot.teacher_id == teacher.id,
            AvailabilitySlot.day == starts_naive.date(),
            AvailabilitySlot.start_time == starts_naive.time(),
        )
        .with_for_update()
        .one_or_none()
    )
    if slot is None or slot.state != "free":
        raise HTTPException(status.HTTP_409_CONFLICT, "That slot is no longer available")
    slot.state = "booked"

    lesson = Lesson(
        teacher_id=teacher.id,
        student_id=user.id,
        topic_fr=t(lesson_type["label"], "fr"),
        topic_en=t(lesson_type["label"], "en"),
        starts_at=starts_at,
        duration_minutes=lesson_type["duration"],
        status="confirmed",
        lesson_type_fr=t(lesson_type["label"], "fr"),
        lesson_type_en=t(lesson_type["label"], "en"),
    )
    db.add(lesson)
    db.flush()

    user.pass_credits -= 1

    # Record what the teacher is owed. Held until the refund window closes.
    gross = teacher.rate_xaf
    fee = gross * settings.platform_fee_bps // 10_000
    db.add(
        LedgerEntry(
            lesson_id=lesson.id,
            teacher_id=teacher.id,
            gross_xaf=gross,
            platform_fee_xaf=fee,
            teacher_payable_xaf=gross - fee,
            state="held",
        )
    )

    # Booking opens a conversation if there isn't one already.
    existing = (
        db.query(Thread)
        .filter(Thread.teacher_id == teacher.id, Thread.student_id == user.id)
        .one_or_none()
    )
    if existing is None:
        db.add(Thread(teacher_id=teacher.id, student_id=user.id))

    db.commit()
    return CreatedBooking(id=lesson.id)
