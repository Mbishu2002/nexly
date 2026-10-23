"""The live session: LiveKit join, in-session state, wrap-up and moderation."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status

from app import catalog
from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.catalog import t
from app.core.config import settings
from app.core.i18n import pick
from app.models import (
    Block,
    LedgerEntry,
    Lesson,
    LessonBoard,
    LessonNote,
    Report,
    Review,
    SessionReview,
)
from app.schemas import (
    ClassroomJoin,
    ClassroomSession,
    ClassroomToken,
    CreatedReview,
    Highlight,
    PhoneticGuide,
    Protection,
    ReportAttachment,
    ReportContext,
    ReportPromise,
    ReportReason,
    ReportTarget,
    SessionNote,
    SessionSummary,
    SubmitReportIn,
    SubmitReviewIn,
    SubmittedReport,
    VocabItem,
)
from app.services.livekit import LiveKitNotConfigured, create_join_token, room_name_for_lesson

router = APIRouter(prefix="/sessions", tags=["classroom"])

# The classroom unlocks shortly before the start time.
JOIN_WINDOW = timedelta(minutes=10)

_HIGHLIGHTS: list[tuple[str, tuple[str, str]]] = [
    ("clarity", ("Explications claires", "Clear explanations")),
    ("patience", ("Patient·e et encourageant·e", "Patient and encouraging")),
    ("culture", ("Contexte culturel riche", "Rich cultural context")),
    ("pronunciation", ("Correction de la prononciation", "Pronunciation coaching")),
    ("materials", ("Bons supports", "Good materials")),
]


def _participant(lesson: Lesson, user_id: str) -> str:
    """'teacher' or 'student' -- or raise, if the caller is neither."""
    if lesson.student_id == user_id:
        return "student"
    if lesson.teacher and lesson.teacher.user_id == user_id:
        return "teacher"
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a participant in this session")


def _require_lesson(db: DbSession, lesson_id: str, user_id: str) -> tuple[Lesson, str]:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return lesson, _participant(lesson, user_id)


def _build_session(db: DbSession, lesson: Lesson, user, locale) -> ClassroomSession:
    board = (
        db.query(LessonBoard).filter(LessonBoard.lesson_id == lesson.id).one_or_none()
    )
    notes = (
        db.query(LessonNote)
        .filter(LessonNote.lesson_id == lesson.id)
        .order_by(LessonNote.created_at)
        .all()
    )
    elapsed = max(0, int((datetime.now(UTC) - lesson.starts_at).total_seconds()))

    guide = (board.phonetic_guide if board else {}) or {}
    return ClassroomSession(
        id=lesson.id,
        teacher=lesson.teacher.name if lesson.teacher else "",
        student=lesson.student.name,
        elapsedSeconds=min(elapsed, lesson.duration_minutes * 60),
        lengthSeconds=lesson.duration_minutes * 60,
        latency="",
        boardTitle=pick(board, "title", locale) if board else pick(lesson, "topic", locale),
        vocab=[
            VocabItem(word=v.get("word", ""), gloss=v.get(f"gloss_{locale}", ""))
            for v in ((board.vocab if board else []) or [])
        ],
        phoneticGuide=PhoneticGuide(
            target=guide.get("target", ""),
            ipa=guide.get("ipa", ""),
            hint=guide.get(f"hint_{locale}", ""),
        ),
        notes=[
            SessionNote(
                from_="me" if n.author_id == user.id else "teacher",
                author=(
                    user.name
                    if n.author_id == user.id
                    else (lesson.teacher.name if lesson.teacher else "")
                ),
                text=n.body,
            )
            for n in notes
        ],
    )


@router.get("/{lesson_id}/classroom", response_model=ClassroomSession)
def get_classroom(
    lesson_id: str, db: DbSession, user: CurrentUser, locale: ReqLocale
) -> ClassroomSession:
    lesson, _ = _require_lesson(db, lesson_id, user.id)
    return _build_session(db, lesson, user, locale)


@router.post("/{lesson_id}/token", response_model=ClassroomToken)
def issue_token(lesson_id: str, db: DbSession, user: CurrentUser) -> ClassroomToken:
    """Mint a LiveKit join token for a session the caller is part of."""
    lesson, role = _require_lesson(db, lesson_id, user.id)

    if lesson.status == "cancelled":
        raise HTTPException(status.HTTP_409_CONFLICT, "Session was cancelled")
    if lesson.starts_at - datetime.now(UTC) > JOIN_WINDOW:
        raise HTTPException(status.HTTP_425_TOO_EARLY, "The classroom is not open yet")

    room = lesson.room_name or room_name_for_lesson(lesson.id)
    if not lesson.room_name:
        lesson.room_name = room
        db.commit()

    try:
        token = create_join_token(
            room=room, identity=user.id, display_name=user.name, can_publish=True
        )
    except LiveKitNotConfigured as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    return ClassroomToken(url=settings.livekit_url, token=token, room=room, identity=user.id)


@router.post("/{lesson_id}/join", response_model=ClassroomJoin)
def join_classroom(
    lesson_id: str, db: DbSession, user: CurrentUser, locale: ReqLocale
) -> ClassroomJoin:
    """Token plus opening state in one call.

    The client needs both to render the classroom, and two round-trips on a
    Cameroonian mobile connection is a visible delay.
    """
    creds = issue_token(lesson_id, db, user)
    lesson, _ = _require_lesson(db, lesson_id, user.id)
    return ClassroomJoin(
        url=creds.url,
        token=creds.token,
        room=creds.room,
        identity=creds.identity,
        session=_build_session(db, lesson, user, locale),
    )


@router.post("/livekit/webhook", include_in_schema=False)
async def livekit_webhook(request: Request, db: DbSession) -> dict[str, str]:
    """Room lifecycle events.

    When a room finishes, mark the lesson completed and release the teacher's
    ledger entry from `held` to `payable`. Doing it here rather than on a timer
    means the money follows the session actually happening.
    """
    body = await request.json()
    event = body.get("event")
    # LiveKit sends `room` as an object; accept a bare name too so a proxy that
    # flattens the payload does not silently drop every completion event.
    raw_room = body.get("room") or {}
    room = raw_room if isinstance(raw_room, str) else raw_room.get("name", "")

    if event != "room_finished" or not room.startswith("lesson-"):
        return {"status": "ignored"}

    lesson = db.get(Lesson, room.removeprefix("lesson-"))
    if lesson is None:
        return {"status": "ignored"}

    if lesson.status != "completed":
        lesson.status = "completed"
        for entry in db.query(LedgerEntry).filter(
            LedgerEntry.lesson_id == lesson.id, LedgerEntry.state == "held"
        ):
            entry.state = "payable"
        db.commit()

    return {"status": "ok"}


@router.get("/{lesson_id}/summary", response_model=SessionSummary)
def get_summary(
    lesson_id: str, db: DbSession, user: CurrentUser, locale: ReqLocale
) -> SessionSummary:
    lesson, _ = _require_lesson(db, lesson_id, user.id)
    return SessionSummary(
        id=lesson.id,
        teacher=lesson.teacher.name if lesson.teacher else "",
        teacherId=lesson.teacher_id,
        credential=pick(lesson.teacher, "credential", locale) if lesson.teacher else "",
        duration=lesson.duration_minutes,
        subject=pick(lesson, "topic", locale),
        when=lesson.starts_at.date().isoformat(),
        highlights=[
            Highlight(id=hid, label=t(label, locale)) for hid, label in _HIGHLIGHTS
        ],
        remainingSessions=user.pass_credits,
    )


@router.post("/{lesson_id}/review", response_model=CreatedReview, status_code=201)
def submit_review(
    lesson_id: str, body: SubmitReviewIn, db: DbSession, user: CurrentUser
) -> CreatedReview:
    lesson, role = _require_lesson(db, lesson_id, user.id)
    if role != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the learner can review a session")

    existing = (
        db.query(SessionReview).filter(SessionReview.lesson_id == lesson.id).one_or_none()
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "This session has already been reviewed")

    review = SessionReview(
        lesson_id=lesson.id,
        author_id=user.id,
        rating=body.rating,
        highlights=body.highlights,
        comment=body.comment,
        show_profile=body.showProfile,
    )
    db.add(review)

    # A public Review is only created when the learner agreed to show it.
    if body.showProfile and lesson.teacher:
        db.add(
            Review(
                teacher_id=lesson.teacher_id,
                author_id=user.id,
                author_name=user.name,
                rating=body.rating,
                body=body.comment,
            )
        )
        teacher = lesson.teacher
        total = teacher.rating * teacher.reviews_count + body.rating
        teacher.reviews_count += 1
        teacher.rating = round(total / teacher.reviews_count, 2)

    db.commit()
    return CreatedReview(id=review.id)


@router.get("/{lesson_id}/report-context", response_model=ReportContext)
def get_report_context(
    lesson_id: str, db: DbSession, user: CurrentUser, locale: ReqLocale
) -> ReportContext:
    lesson, role = _require_lesson(db, lesson_id, user.id)
    other = (
        (lesson.teacher.name if lesson.teacher else "")
        if role == "student"
        else lesson.student.name
    )

    return ReportContext(
        promise=ReportPromise(
            headline=t(catalog.REPORT_PROMISE["headline"], locale),
            body=t(catalog.REPORT_PROMISE["body"], locale),
            sla=t(catalog.REPORT_PROMISE["sla"], locale),
            compliance=t(catalog.REPORT_PROMISE["compliance"], locale),
        ),
        target=ReportTarget(
            kind="session",
            person=other,
            role=("Enseignant" if locale == "fr" else "Teacher")
            if role == "student"
            else ("Apprenant" if locale == "fr" else "Learner"),
            subject=pick(lesson, "topic", locale),
            ref=f"NK-{lesson.id[:8].upper()}",
            when=lesson.starts_at.date().isoformat(),
            rtcRoom=lesson.room_name or room_name_for_lesson(lesson.id),
        ),
        reasons=[
            ReportReason(
                id=r["id"], label=t(r["label"], locale), detail=t(r["detail"], locale)
            )
            for r in catalog.REPORT_REASONS
        ],
        protections=[
            Protection(
                id=p["id"],
                icon=p["icon"],
                label=t(p["label"], locale),
                detail=t(p["detail"], locale),
                defaultOn=p["defaultOn"],
            )
            for p in catalog.PROTECTIONS
        ],
        minDetailChars=catalog.MIN_REPORT_DETAIL_CHARS,
        attachment=ReportAttachment(name="", size=""),
    )


@router.post("/{lesson_id}/reports", response_model=SubmittedReport, status_code=201)
def submit_report(
    lesson_id: str, body: SubmitReportIn, db: DbSession, user: CurrentUser
) -> SubmittedReport:
    """File a moderation report; lands in the admin queue for 24h triage."""
    lesson, role = _require_lesson(db, lesson_id, user.id)

    valid = {r["id"] for r in catalog.REPORT_REASONS}
    if body.reason not in valid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown reason")
    if len(body.details) < catalog.MIN_REPORT_DETAIL_CHARS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Please describe what happened in at least "
            f"{catalog.MIN_REPORT_DETAIL_CHARS} characters",
        )

    reported_user_id = (
        (lesson.teacher.user_id if lesson.teacher else None)
        if role == "student"
        else lesson.student_id
    )

    report = Report(
        reporter_id=user.id,
        reported_user_id=reported_user_id,
        lesson_id=lesson.id,
        reason=body.reason,
        detail=body.details,
    )
    db.add(report)

    # Protections the reporter asked for take effect immediately, not after
    # triage: waiting 24h to stop contact is the wrong default.
    if "block" in body.protections and reported_user_id:
        already = (
            db.query(Block)
            .filter(Block.blocker_id == user.id, Block.blocked_id == reported_user_id)
            .one_or_none()
        )
        if already is None:
            db.add(Block(blocker_id=user.id, blocked_id=reported_user_id))

    db.commit()
    return SubmittedReport(ref=f"NK-{report.id[:8].upper()}")
