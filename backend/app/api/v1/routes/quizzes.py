"""Audio tone drills attached to courses."""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.i18n import Locale, pick
from app.models import Quiz as QuizRow
from app.models import QuizAttempt
from app.schemas import (
    Question,
    Quiz,
    QuizFact,
    QuizOption,
    QuizResultIn,
    QuizResultOut,
    QuizSpeaker,
    ToneHint,
)

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def _localised_question(raw: dict, locale: Locale) -> Question:
    """Questions are authored JSONB with `*_fr` / `*_en` keys throughout."""

    def s(key: str) -> str:
        return raw.get(f"{key}_{locale}") or raw.get(f"{key}_en") or raw.get(f"{key}_fr") or ""

    return Question(
        id=raw.get("id", ""),
        prompt=s("prompt"),
        instruction=s("instruction"),
        speaker=QuizSpeaker(
            name=raw.get("speaker", {}).get("name", ""),
            credential=raw.get("speaker", {}).get(f"credential_{locale}", ""),
        ),
        toneHint=ToneHint(
            high=raw.get("toneHint", {}).get(f"high_{locale}", ""),
            low=raw.get("toneHint", {}).get(f"low_{locale}", ""),
        ),
        clipLength=raw.get("clipLength", ""),
        options=[
            QuizOption(
                key=o.get("key", ""),
                word=o.get("word", ""),
                tone=o.get("tone", ""),
                meaning=o.get(f"meaning_{locale}", ""),
            )
            for o in raw.get("options", [])
        ],
        correct=raw.get("correct", "A"),
        xp=raw.get("xp", 0),
        successLabel=s("successLabel"),
        successHint=s("successHint"),
        fact=QuizFact(
            title=raw.get("fact", {}).get(f"title_{locale}", ""),
            body=raw.get("fact", {}).get(f"body_{locale}", ""),
        ),
    )


@router.get("/{quiz_id}", response_model=Quiz)
def get_quiz(quiz_id: str, db: DbSession, user: CurrentUser, locale: ReqLocale) -> Quiz:
    row = db.get(QuizRow, quiz_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz not found")

    # Resume where the learner stopped, so a deep link mid-drill works.
    attempt = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.created_at.desc())
        .first()
    )
    questions = row.questions or []
    start_index = 0
    starting_xp = 0
    if attempt and attempt.completed_at is None:
        start_index = min(attempt.last_index, max(len(questions) - 1, 0))
        starting_xp = attempt.xp

    return Quiz(
        id=row.id,
        title=pick(row, "title", locale),
        hearts=attempt.hearts_left if attempt and attempt.completed_at is None else row.hearts,
        startingXp=starting_xp,
        startIndex=start_index,
        questions=[_localised_question(q, locale) for q in questions],
    )


@router.post("/{quiz_id}/results", response_model=QuizResultOut)
def submit_result(
    quiz_id: str, body: QuizResultIn, db: DbSession, user: CurrentUser
) -> QuizResultOut:
    row = db.get(QuizRow, quiz_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quiz not found")

    # XP is recomputed server-side rather than trusted: the client is just a
    # UI, and an unchecked `xp` field is an invitation to edit the leaderboard.
    max_xp = sum(q.get("xp", 0) for q in (row.questions or []))
    awarded = max(0, min(body.xp, max_xp))

    db.add(
        QuizAttempt(
            quiz_id=quiz_id,
            user_id=user.id,
            xp=awarded,
            hearts_left=body.hearts,
            last_index=len(row.questions or []),
            completed_at=datetime.now(UTC),
        )
    )
    db.commit()
    return QuizResultOut(xp=awarded)
