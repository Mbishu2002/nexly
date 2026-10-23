from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models import Lesson, Report
from app.schemas import ClassroomToken, ReportIn, ReportOut
from app.services.livekit import LiveKitNotConfigured, create_join_token, room_name_for_lesson

router = APIRouter(prefix="/sessions", tags=["classroom"])

JOIN_WINDOW = timedelta(minutes=10)


@router.post("/{lesson_id}/token", response_model=ClassroomToken)
def issue_token(lesson_id: str, db: DbSession, user: CurrentUser) -> ClassroomToken:
    """Mint a LiveKit join token for a lesson the caller actually booked."""
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")

    # Only the two participants may join, and only near the start time.
    is_student = lesson.student_id == user.id
    is_teacher = lesson.teacher and lesson.teacher.user_id == user.id
    if not (is_student or is_teacher):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a participant in this session")

    if lesson.status == "cancelled":
        raise HTTPException(status.HTTP_409_CONFLICT, "Session was cancelled")

    if lesson.starts_at - datetime.now(UTC) > JOIN_WINDOW:
        raise HTTPException(status.HTTP_425_TOO_EARLY, "The classroom is not open yet")

    room = lesson.room_name or room_name_for_lesson(lesson.id)
    if not lesson.room_name:
        lesson.room_name = room
        db.commit()

    try:
        token = create_join_token(room=room, identity=user.id, display_name=user.name)
    except LiveKitNotConfigured as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    return ClassroomToken(
        url=settings.livekit_url, token=token, room=room, identity=user.id
    )


@router.post("/{lesson_id}/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_report(
    lesson_id: str, body: ReportIn, db: DbSession, user: CurrentUser
) -> ReportOut:
    """File a moderation report. Lands in the admin queue for 24h triage."""
    lesson = db.get(Lesson, lesson_id)
    reported_user_id = None
    if lesson is not None:
        reported_user_id = (
            lesson.teacher.user_id if lesson.student_id == user.id else lesson.student_id
        )

    report = Report(
        reporter_id=user.id,
        reported_user_id=reported_user_id,
        lesson_id=lesson.id if lesson else None,
        reason=body.reason,
        detail=body.detail,
    )
    db.add(report)
    db.commit()

    return ReportOut(ref=f"NK-{report.id[:8].upper()}", status=report.status)
