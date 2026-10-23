"""SQLAlchemy models.

Localized content is stored as paired `*_fr` / `*_en` columns and collapsed to
one string per request by `app.core.i18n.pick`. That keeps translation a
storage concern instead of leaking `{fr, en}` objects into API responses --
the client contract promises plain strings.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )


# --------------------------------------------------------------------------
# Identity
# --------------------------------------------------------------------------


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str | None] = mapped_column(String(255))

    # "google" | "apple" | None (email+password). Apple requires Sign in with
    # Apple to be offered whenever another third-party login is.
    oauth_provider: Mapped[str | None] = mapped_column(String(32))
    oauth_subject: Mapped[str | None] = mapped_column(String(255), index=True)

    is_teacher: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)

    locale: Mapped[str] = mapped_column(String(2), default="fr")
    timezone: Mapped[str] = mapped_column(String(64), default="Africa/Douala")

    # Learner-side progress, surfaced on the Profile tab.
    level: Mapped[str] = mapped_column(String(8), default="A1")
    streak: Mapped[int] = mapped_column(Integer, default=0)
    minutes_learned: Mapped[int] = mapped_column(Integer, default=0)
    lessons_taken: Mapped[int] = mapped_column(Integer, default=0)
    # Lesson credits bought on the WEB. The app spends them; it never sells them.
    pass_credits: Mapped[int] = mapped_column(Integer, default=0)

    teacher: Mapped[Teacher | None] = relationship(back_populates="user", uselist=False)


# --------------------------------------------------------------------------
# Marketplace
# --------------------------------------------------------------------------


class Teacher(Base, TimestampMixin):
    __tablename__ = "teachers"

    # Human-readable slug ("henriette-mbassi") -- it is the public URL key.
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    name: Mapped[str] = mapped_column(String(160))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    intro_video_url: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(80))

    headline_fr: Mapped[str] = mapped_column(Text)
    headline_en: Mapped[str] = mapped_column(Text)
    credential_fr: Mapped[str] = mapped_column(Text, default="")
    credential_en: Mapped[str] = mapped_column(Text, default="")
    badge_fr: Mapped[str] = mapped_column(String(120), default="")
    badge_en: Mapped[str] = mapped_column(String(120), default="")
    badge_icon: Mapped[str] = mapped_column(String(64), default="verified")

    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("0"))
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)

    # Minor-unit-free XAF. NEVER serialized to the mobile client -- see
    # app/schemas/teacher.py and the architecture plan, section 6.
    rate_xaf: Mapped[int] = mapped_column(Integer, default=0)

    languages: Mapped[list] = mapped_column(JSONB, default=list)
    tags_fr: Mapped[list] = mapped_column(JSONB, default=list)
    tags_en: Mapped[list] = mapped_column(JSONB, default=list)
    skills: Mapped[list] = mapped_column(JSONB, default=list)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="teacher")
    reviews: Mapped[list[Review]] = relationship(back_populates="teacher")
    slots: Mapped[list[AvailabilitySlot]] = relationship(back_populates="teacher")


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    author_name: Mapped[str] = mapped_column(String(160))
    rating: Mapped[int] = mapped_column(Integer)
    body: Mapped[str] = mapped_column(Text, default="")
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    teacher: Mapped[Teacher] = relationship(back_populates="reviews")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    __table_args__ = (UniqueConstraint("teacher_id", "day", "start_time"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    day: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    # "free" | "held" | "booked"
    state: Mapped[str] = mapped_column(String(16), default="free")

    teacher: Mapped[Teacher] = relationship(back_populates="slots")


# --------------------------------------------------------------------------
# Lessons
# --------------------------------------------------------------------------


class Lesson(Base, TimestampMixin):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="RESTRICT"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    topic_fr: Mapped[str] = mapped_column(Text)
    topic_en: Mapped[str] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)

    # Stored as an absolute UTC instant; rendered per the viewer's timezone.
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=50)

    # "confirmed" | "pending" | "completed" | "cancelled"
    status: Mapped[str] = mapped_column(String(16), default="confirmed")
    language_fr: Mapped[str] = mapped_column(String(80), default="")
    language_en: Mapped[str] = mapped_column(String(80), default="")
    level_fr: Mapped[str] = mapped_column(String(80), default="")
    level_en: Mapped[str] = mapped_column(String(80), default="")
    lesson_type_fr: Mapped[str] = mapped_column(String(80), default="")
    lesson_type_en: Mapped[str] = mapped_column(String(80), default="")

    objectives_fr: Mapped[list] = mapped_column(JSONB, default=list)
    objectives_en: Mapped[list] = mapped_column(JSONB, default=list)
    materials: Mapped[list] = mapped_column(JSONB, default=list)
    teacher_note_fr: Mapped[str] = mapped_column(Text, default="")
    teacher_note_en: Mapped[str] = mapped_column(Text, default="")

    # LiveKit room name, minted on first join.
    room_name: Mapped[str | None] = mapped_column(String(120))

    teacher: Mapped[Teacher] = relationship()
    student: Mapped[User] = relationship()


class Course(Base, TimestampMixin):
    """Pre-recorded content. Phase 2, but modelled now so progress has a home."""

    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    title_fr: Mapped[str] = mapped_column(Text)
    title_en: Mapped[str] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(32), default="A1")
    lesson_count: Mapped[int] = mapped_column(Integer, default=0)
    minutes_per_lesson: Mapped[int] = mapped_column(Integer, default=15)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)


class CourseProgress(Base):
    __tablename__ = "course_progress"
    __table_args__ = (UniqueConstraint("course_id", "user_id"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    completed_lessons: Mapped[int] = mapped_column(Integer, default=0)


# --------------------------------------------------------------------------
# Messaging
# --------------------------------------------------------------------------


class Thread(Base, TimestampMixin):
    __tablename__ = "threads"
    __table_args__ = (UniqueConstraint("teacher_id", "student_id"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    messages: Mapped[list[ChatMessage]] = relationship(
        back_populates="thread", order_by="ChatMessage.sent_at"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    thread_id: Mapped[str] = mapped_column(ForeignKey("threads.id", ondelete="CASCADE"))
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # User-authored text is NOT translated -- it is stored as written.
    body: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    thread: Mapped[Thread] = relationship(back_populates="messages")


# --------------------------------------------------------------------------
# Money: payments happen on the WEB only (architecture plan, section 6)
# --------------------------------------------------------------------------


class Payment(Base, TimestampMixin):
    """A student's mobile-money purchase, initiated on the web via Fapshi."""

    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))

    # Fapshi's identifier for the transaction; unique so webhook replays are
    # idempotent rather than double-crediting the account.
    provider: Mapped[str] = mapped_column(String(32), default="fapshi")
    provider_ref: Mapped[str] = mapped_column(String(120), unique=True, index=True)

    amount_xaf: Mapped[int] = mapped_column(Integer)
    credits: Mapped[int] = mapped_column(Integer, default=0)
    # "pending" | "successful" | "failed" | "expired"
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    raw_payload: Mapped[dict] = mapped_column(JSONB, default=dict)


class LedgerEntry(Base, TimestampMixin):
    """Double-sided record behind teacher payouts.

    Fapshi has no native marketplace split, so the platform fee and the
    teacher's share are recorded here and settled in batches.
    """

    __tablename__ = "ledger_entries"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    lesson_id: Mapped[str | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"))
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="RESTRICT"))
    payment_id: Mapped[str | None] = mapped_column(ForeignKey("payments.id", ondelete="SET NULL"))

    gross_xaf: Mapped[int] = mapped_column(Integer)
    platform_fee_xaf: Mapped[int] = mapped_column(Integer)
    teacher_payable_xaf: Mapped[int] = mapped_column(Integer)

    # Held until the refund window closes or a dispute resolves.
    # "held" | "payable" | "paid" | "reversed"
    state: Mapped[str] = mapped_column(String(16), default="held", index=True)
    payout_id: Mapped[str | None] = mapped_column(ForeignKey("payouts.id", ondelete="SET NULL"))


class Payout(Base, TimestampMixin):
    __tablename__ = "payouts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="RESTRICT"))
    amount_xaf: Mapped[int] = mapped_column(Integer)
    destination: Mapped[str] = mapped_column(String(64))  # "mtn_momo" | "orange_money"
    destination_number: Mapped[str] = mapped_column(String(32))
    # "requested" | "processing" | "paid" | "failed"
    status: Mapped[str] = mapped_column(String(16), default="requested", index=True)
    provider_ref: Mapped[str | None] = mapped_column(String(120))


# --------------------------------------------------------------------------
# Trust & safety
# --------------------------------------------------------------------------


class Report(Base, TimestampMixin):
    """Moderation queue. Apple expects action on reports within ~24h."""

    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    reported_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    lesson_id: Mapped[str | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"))

    reason: Mapped[str] = mapped_column(String(64))
    detail: Mapped[str] = mapped_column(Text, default="")
    # "open" | "actioned" | "dismissed"
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Block(Base, TimestampMixin):
    """User-level block/mute. Also an Apple requirement for stranger chat."""

    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    blocker_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    blocked_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
