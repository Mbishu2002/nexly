"""Teacher application and verification."""

from datetime import UTC, datetime

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.i18n import Locale
from app.models import TeacherApplication
from app.schemas import (
    Application,
    ApplicationDoc,
    ApplicationLanguage,
    ApplicationStep,
    ApplicationSubmitted,
    ApplicationVideo,
)

router = APIRouter(prefix="/me/application", tags=["teacher application"])

_STEPS: list[tuple[str, str]] = [
    ("Profil", "Profile"),
    ("Langues", "Languages"),
    ("Vidéo d'intro", "Intro video"),
    ("Vérification", "Verification"),
]

_GUIDANCE: list[tuple[str, str]] = [
    ("Filmez en paysage, visage bien éclairé.", "Film in landscape, with your face well lit."),
    ("Présentez-vous dans la langue que vous enseignez.",
     "Introduce yourself in the language you teach."),
    ("Expliquez votre méthode en 60 secondes.", "Explain your method in 60 seconds."),
    ("Évitez les bruits de fond et la musique.", "Avoid background noise and music."),
]

_BASINS: list[tuple[str, str]] = [
    ("Littoral — Douala", "Littoral — Douala"),
    ("Centre — Yaoundé", "Centre — Yaoundé"),
    ("Ouest — Bafoussam", "West — Bafoussam"),
]


def _pair(pair: tuple[str, str], locale: Locale) -> str:
    return pair[0] if locale == "fr" else pair[1]


def _get_or_create(db: DbSession, user_id: str) -> TeacherApplication:
    row = (
        db.query(TeacherApplication)
        .filter(TeacherApplication.user_id == user_id)
        .one_or_none()
    )
    if row is None:
        row = TeacherApplication(user_id=user_id, step=1, status="draft")
        db.add(row)
        db.commit()
    return row


@router.get("", response_model=Application)
def get_application(db: DbSession, user: CurrentUser, locale: ReqLocale) -> Application:
    row = _get_or_create(db, user.id)
    meta = row.intro_video_meta or {}

    return Application(
        steps=[
            ApplicationStep(
                label=_pair(step, locale),
                done=index + 1 < row.step,
                current=index + 1 == row.step,
            )
            for index, step in enumerate(_STEPS)
        ],
        video=ApplicationVideo(
            duration=meta.get("duration", ""),
            quality=meta.get("quality", ""),
            audio=meta.get("audio", ""),
            file=meta.get("file", ""),
            size=meta.get("size", ""),
        ),
        guidance=[_pair(g, locale) for g in _GUIDANCE],
        docs=[
            ApplicationDoc(
                id=d.get("id", ""),
                icon=d.get("icon", "description"),
                title=d.get("title", ""),
                hint=d.get("hint", ""),
                verified=bool(d.get("verified")),
            )
            for d in (row.documents or [])
        ],
        languages=[
            ApplicationLanguage(name=item.get("name", ""), level=item.get("level", ""))
            for item in (row.languages or [])
        ],
        basins=[_pair(b, locale) for b in _BASINS],
    )


@router.post("/submit", response_model=ApplicationSubmitted, status_code=status.HTTP_202_ACCEPTED)
def submit_application(db: DbSession, user: CurrentUser) -> ApplicationSubmitted:
    """Hand the application to the review queue.

    No Teacher row is created here: that happens on approval, so an unreviewed
    applicant can never appear in discovery.
    """
    row = _get_or_create(db, user.id)
    row.status = "pending"
    row.step = len(_STEPS)
    row.submitted_at = datetime.now(UTC)
    db.commit()
    return ApplicationSubmitted(status="pending")
