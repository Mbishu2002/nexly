"""Arq background worker.

    arq app.worker.WorkerSettings

Jobs fall into two kinds:

- **queued** — enqueued from a request (`enqueue("send_message_push", ...)`),
  for work that must not sit in the request path.
- **cron** — scheduled here: reminders, settling the payout ledger, reaping
  abandoned uploads.

Every job opens and closes its own session. Jobs run outside the request
lifecycle, so there is no dependency-injected session to borrow, and a
long-lived one would hold a connection open between runs.

All cron jobs are idempotent: Arq can run one twice after a restart, and
"twice" must not mean two reminders or two payouts.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import LedgerEntry, Lesson, MediaAsset, Teacher, User
from app.services import notify, storage

log = logging.getLogger(__name__)


def _redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(settings.redis_url)


async def enqueue(job: str, **kwargs: Any) -> None:
    """Queue a job from request code."""
    from arq import create_pool

    pool = await create_pool(_redis_settings())
    try:
        await pool.enqueue_job(job, **kwargs)
    finally:
        await pool.aclose()


# --------------------------------------------------------------------------
# Queued jobs
# --------------------------------------------------------------------------


async def send_message_push(
    ctx: dict, *, user_id: str, sender_name: str, preview: str, thread_id: str
) -> str:
    """Nudge someone who has a message waiting."""
    db: Session = SessionLocal()
    try:
        result = await notify.send_push(
            db,
            user_id=user_id,
            title=sender_name,
            body=preview,
            data={"type": "message", "threadId": thread_id},
        )
        db.commit()
        return result.detail or ("sent" if result.ok else "not sent")
    finally:
        db.close()


async def send_booking_confirmation(ctx: dict, *, lesson_id: str) -> str:
    db: Session = SessionLocal()
    try:
        lesson = db.get(Lesson, lesson_id)
        if lesson is None:
            return "lesson gone"

        student = lesson.student
        when = lesson.starts_at.astimezone(UTC).strftime("%Y-%m-%d %H:%M UTC")
        teacher_name = lesson.teacher.name if lesson.teacher else ""

        result = await notify.send_email(
            to=student.email,
            subject="Your Nexly lesson is booked",
            html=(
                f"<p>Hi {student.name},</p>"
                f"<p>Your lesson with {teacher_name} is confirmed for "
                f"<strong>{when}</strong>.</p>"
                "<p>You can join from the Nexly app ten minutes before it starts.</p>"
            ),
        )
        notify.record(
            db,
            user_id=student.id,
            kind="booking_confirmation",
            dedupe_key=lesson.id,
            channel="email",
            status="sent" if result.ok else "failed",
            detail=result.detail,
        )
        db.commit()
        return result.detail or "ok"
    finally:
        db.close()


async def transcode_media(ctx: dict, *, asset_id: str) -> str:
    """Turn an uploaded video into adaptive-bitrate HLS.

    Marked `processing` first so a crashed worker leaves a row that says what
    happened rather than one stuck on `uploaded` forever.

    NOTE: the ffmpeg pipeline itself is not implemented -- see the open
    decision in the architecture plan about self-managed ffmpeg versus
    Cloudflare Stream or Mux. This job is the seam: it records state, and the
    encoder drops in behind it.
    """
    db: Session = SessionLocal()
    try:
        asset = db.get(MediaAsset, asset_id)
        if asset is None:
            return "asset gone"

        head = storage.head_object(asset.storage_key)
        if head is None:
            asset.status = "failed"
            asset.error = "Object missing from R2"
            db.commit()
            return "missing"

        asset.size_bytes = int(head.get("ContentLength", 0))
        asset.content_type = head.get("ContentType", asset.content_type)
        asset.status = "processing"
        db.commit()

        # Audio needs no renditions; it is ready as uploaded.
        if asset.content_type.startswith("audio/"):
            asset.status = "ready"
            db.commit()
            return "ready (audio)"

        log.info("transcode pending for %s (encoder not yet wired)", asset.id)
        return "processing"
    finally:
        db.close()


# --------------------------------------------------------------------------
# Cron jobs
# --------------------------------------------------------------------------


async def send_booking_reminders(ctx: dict) -> str:
    """Remind both sides shortly before a session.

    `NotificationLog` keyed on the lesson id makes a re-run a no-op, so this
    can run every five minutes without buzzing anyone twice.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(UTC)
        window_end = now + timedelta(minutes=settings.booking_reminder_lead_minutes)

        due = (
            db.query(Lesson)
            .filter(
                Lesson.starts_at > now,
                Lesson.starts_at <= window_end,
                Lesson.status == "confirmed",
            )
            .all()
        )

        sent = 0
        for lesson in due:
            recipients = [lesson.student]
            if lesson.teacher and lesson.teacher.user:
                recipients.append(lesson.teacher.user)

            for person in recipients:
                if notify.already_sent(
                    db, user_id=person.id, kind="lesson_reminder", dedupe_key=lesson.id
                ):
                    continue

                minutes = max(1, int((lesson.starts_at - now).total_seconds() // 60))
                result = await notify.send_push(
                    db,
                    user_id=person.id,
                    title="Your lesson starts soon",
                    body=f"Starting in {minutes} minutes.",
                    data={"type": "lesson", "lessonId": lesson.id},
                )
                notify.record(
                    db,
                    user_id=person.id,
                    kind="lesson_reminder",
                    dedupe_key=lesson.id,
                    channel="push",
                    status="sent" if result.ok else "skipped",
                    detail=result.detail,
                )
                sent += 1

        db.commit()
        return f"{sent} reminder(s) for {len(due)} lesson(s)"
    finally:
        db.close()


async def settle_ledger(ctx: dict) -> str:
    """Release held earnings once the refund window has passed.

    Only entries whose lesson actually completed are released: a held entry on
    a cancelled or no-show session must not quietly become payable with time.
    """
    db: Session = SessionLocal()
    try:
        cutoff = datetime.now(UTC) - timedelta(hours=settings.payout_hold_hours)

        held = (
            db.query(LedgerEntry)
            .join(Lesson, LedgerEntry.lesson_id == Lesson.id)
            .filter(
                LedgerEntry.state == "held",
                Lesson.status == "completed",
                Lesson.starts_at <= cutoff,
            )
            .all()
        )
        for entry in held:
            entry.state = "payable"

        db.commit()
        return f"released {len(held)} entr{'y' if len(held) == 1 else 'ies'}"
    finally:
        db.close()


async def run_payout_batch(ctx: dict) -> str:
    """Weekly automatic payouts.

    Deliberately conservative: it reports what *would* be paid and leaves the
    disbursement to a human in the admin dashboard, because Fapshi and MoMo
    differ on whether a disbursement API exists at all -- an open decision in
    the architecture plan. Moving money on a schedule before that is settled
    is the wrong kind of automatic.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(LedgerEntry)
            .filter(LedgerEntry.state == "payable", LedgerEntry.payout_id.is_(None))
            .all()
        )
        by_teacher: dict[str, int] = {}
        for entry in rows:
            by_teacher[entry.teacher_id] = (
                by_teacher.get(entry.teacher_id, 0) + entry.teacher_payable_xaf
            )

        for teacher_id, amount in by_teacher.items():
            teacher = db.get(Teacher, teacher_id)
            log.info(
                "payout due: %s %s XAF",
                teacher.name if teacher else teacher_id,
                amount,
            )

        return f"{len(by_teacher)} teacher(s) due, {sum(by_teacher.values())} XAF total"
    finally:
        db.close()


async def reap_abandoned_uploads(ctx: dict) -> str:
    """Delete upload rows whose bytes never arrived.

    A presigned URL expires in fifteen minutes; a row still `pending` an hour
    later is an upload someone walked away from.
    """
    db: Session = SessionLocal()
    try:
        cutoff = datetime.now(UTC) - timedelta(hours=1)
        stale = (
            db.query(MediaAsset)
            .filter(MediaAsset.status == "pending", MediaAsset.created_at < cutoff)
            .all()
        )
        for asset in stale:
            storage.delete_object(asset.storage_key)
            db.delete(asset)
        db.commit()
        return f"reaped {len(stale)}"
    finally:
        db.close()


async def startup(ctx: dict) -> None:
    log.info("nexly worker ready")


class WorkerSettings:
    redis_settings = _redis_settings()
    on_startup = startup

    functions = [
        send_message_push,
        send_booking_confirmation,
        transcode_media,
    ]

    cron_jobs = [
        # Reminders need a tight loop; the dedupe log makes that safe.
        cron(send_booking_reminders, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),
        cron(settle_ledger, hour={3}, minute=0),
        cron(reap_abandoned_uploads, hour={4}, minute=0),
        # Friday mornings, matching the wallet's "next auto payout".
        cron(run_payout_batch, weekday="fri", hour=6, minute=0),
    ]

    # A job that hangs must not hold a worker slot forever.
    job_timeout = 300
    max_tries = 3
