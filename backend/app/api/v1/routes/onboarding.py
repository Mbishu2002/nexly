from fastapi import APIRouter

from app import catalog
from app.api.deps import ReqLocale
from app.catalog import t
from app.schemas import Language, Level, Motivation, Onboarding

router = APIRouter(tags=["onboarding"])


@router.get("/onboarding", response_model=Onboarding)
def get_onboarding(locale: ReqLocale) -> Onboarding:
    """Catalogue the first-run flow needs. Public: it runs before sign-in."""
    return Onboarding(
        languages=[
            Language(
                slug=lang["slug"],
                name=t(lang["name"], locale),
                region=t(lang["region"], locale),
                tutors=lang["tutors"],
                blurb=t(lang["blurb"], locale),
                icon=lang["icon"],
                popular=lang["popular"],
            )
            for lang in catalog.LANGUAGES
        ],
        motivations=[
            Motivation(id=mid, label=t(label, locale)) for mid, label in catalog.MOTIVATIONS
        ],
        levels=[
            Level(code=code, label=t(label, locale), hint=t(hint, locale))
            for code, label, hint in catalog.LEVELS
        ],
    )
