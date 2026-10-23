from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.deps import DbSession, ReqLocale
from app.core.i18n import Locale, pick
from app.models import Review as ReviewRow
from app.models import Teacher as TeacherRow
from app.schemas import Availability, DiscoveryFilter, Review, Skill, Teacher

router = APIRouter(prefix="/teachers", tags=["teachers"])


def to_teacher(row: TeacherRow, locale: Locale) -> Teacher:
    """Row -> DTO. Note there is no rate field: see schemas.Teacher."""
    tags = row.tags_fr if locale == "fr" else row.tags_en
    skills = [
        Skill(label=s.get(f"label_{locale}", ""), level=s.get(f"level_{locale}", ""))
        for s in (row.skills or [])
    ]
    return Teacher(
        id=row.id,
        name=row.name,
        avatar=row.avatar_url,
        headline=pick(row, "headline", locale),
        city=row.city,
        credential=pick(row, "credential", locale),
        badge=pick(row, "badge", locale),
        badgeIcon=row.badge_icon,
        rating=float(row.rating),
        reviews=row.reviews_count,
        skills=skills,
        tags=list(tags or []),
        availability=Availability(
            label="Next available" if locale == "en" else "Prochaine dispo",
            value="",
            note="",
            icon="schedule",
        ),
        trial="",
        sampleLabel="Intro" if locale == "en" else "Intro",
        sampleIcon="play-arrow",
        languages=list(row.languages or []),
    )


# Static for now; a real deployment drives these off the catalogue table.
_FILTERS: list[tuple[str, str, str]] = [
    ("all", "Tout", "All"),
    ("cameroonian", "Camerounais (Douala, Ewondo)", "Cameroonian (Douala, Ewondo)"),
    ("bilingual", "Bilingue (FR/EN)", "Bilingual (FR/EN)"),
    ("exam", "Prép. examen", "Exam prep"),
    ("top", "Mieux notés", "Top rated"),
]


@router.get("/filters", response_model=list[DiscoveryFilter])
def list_filters(locale: ReqLocale) -> list[DiscoveryFilter]:
    # Declared before /{teacher_id} so "filters" is not captured as an id.
    return [
        DiscoveryFilter(id=fid, label=fr if locale == "fr" else en) for fid, fr, en in _FILTERS
    ]


@router.get("", response_model=list[Teacher])
def list_teachers(
    db: DbSession,
    locale: ReqLocale,
    q: str | None = Query(default=None, description="Free-text search"),
    filter: str | None = Query(default=None, description="Filter id, not a label"),
) -> list[Teacher]:
    stmt = select(TeacherRow).where(TeacherRow.is_published.is_(True))

    if q:
        # Postgres full-text search over the fields a learner would type into,
        # per the architecture plan (Meilisearch only if this stops scaling).
        needle = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(TeacherRow.name).like(needle),
                func.lower(TeacherRow.headline_fr).like(needle),
                func.lower(TeacherRow.headline_en).like(needle),
                func.lower(TeacherRow.city).like(needle),
            )
        )

    # Filters match on stable ids, never on translated labels, so switching
    # language never changes a result set.
    if filter == "top":
        stmt = stmt.where(TeacherRow.rating >= 4.95)
    elif filter == "cameroonian":
        stmt = stmt.where(TeacherRow.languages.contains(["Douala"]))

    stmt = stmt.order_by(TeacherRow.rating.desc())
    return [to_teacher(row, locale) for row in db.execute(stmt).scalars()]


@router.get("/{teacher_id}", response_model=Teacher)
def get_teacher(teacher_id: str, db: DbSession, locale: ReqLocale) -> Teacher:
    row = db.get(TeacherRow, teacher_id)
    if row is None or not row.is_published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Teacher not found")
    return to_teacher(row, locale)


@router.get("/{teacher_id}/reviews", response_model=list[Review])
def list_reviews(teacher_id: str, db: DbSession, locale: ReqLocale) -> list[Review]:
    rows = (
        db.query(ReviewRow)
        .filter(ReviewRow.teacher_id == teacher_id, ReviewRow.is_published.is_(True))
        .order_by(ReviewRow.created_at.desc())
        .all()
    )
    return [
        Review(
            id=r.id,
            name=r.author_name,
            rating=r.rating,
            text=r.body,
            when=r.created_at.date().isoformat(),
        )
        for r in rows
    ]
