"""The teacher side: schedule, roster, resources, earnings and payouts.

Earnings are computed from LedgerEntry rather than stored, so the wallet can
never drift from the entries that justify it.
"""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func

from app import catalog
from app.api.deps import CurrentTeacher, CurrentUser, DbSession, ReqLocale
from app.catalog import t
from app.core.i18n import Locale, pick
from app.models import (
    AvailabilitySlot,
    LearnerNote,
    LedgerEntry,
    Lesson,
    PayoutAccount,
    Payout,
    Teacher,
    User,
)
from app.schemas import (
    Earnings,
    Learner,
    LearnerAttachment,
    Movement,
    NextSession,
    PayoutAccount as PayoutAccountOut,
    PayoutIn,
    PayoutOut,
    Resource,
    RevenuePoint,
    RevenueSource,
    RosterFilter,
    Slot,
    TeacherProfile,
    Wallet,
    WeekDay,
)

router = APIRouter(prefix="/me/teacher", tags=["teacher portal"])

_MONTHS = {
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
           "août", "septembre", "octobre", "novembre", "décembre"],
    "en": ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"],
}
_SHORT_DAYS = {
    "fr": ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
    "en": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
}


def _month_start(now: datetime) -> datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


@router.get("", response_model=TeacherProfile)
def get_teacher_profile(
    db: DbSession, teacher: CurrentTeacher, locale: ReqLocale
) -> TeacherProfile:
    now = datetime.now(UTC)
    today = now.astimezone(ZoneInfo(teacher.user.timezone)).date()

    lessons = db.query(Lesson).filter(Lesson.teacher_id == teacher.id)
    done = lessons.filter(Lesson.status == "completed").count()
    upcoming = lessons.filter(
        Lesson.starts_at >= now, Lesson.status.in_(("confirmed", "pending"))
    ).count()

    today_rows = [
        lesson
        for lesson in lessons.all()
        if lesson.starts_at.astimezone(ZoneInfo(teacher.user.timezone)).date() == today
    ]

    minutes_this_month = (
        db.query(func.coalesce(func.sum(Lesson.duration_minutes), 0))
        .filter(
            Lesson.teacher_id == teacher.id,
            Lesson.status == "completed",
            Lesson.starts_at >= _month_start(now),
        )
        .scalar()
        or 0
    )

    learners = (
        db.query(func.count(func.distinct(Lesson.student_id)))
        .filter(Lesson.teacher_id == teacher.id)
        .scalar()
        or 0
    )

    first_name = teacher.name.replace("Dr. ", "").split(" ")[0]
    return TeacherProfile(
        name=teacher.name,
        firstName=first_name,
        badge=pick(teacher, "badge", locale),
        status=("Vérifié" if locale == "fr" else "Verified")
        if teacher.is_verified
        else ("En attente" if locale == "fr" else "Pending"),
        rating=float(teacher.rating),
        reviews=teacher.reviews_count,
        hoursThisMonth=minutes_this_month // 60,
        sessionsToday=len(today_rows),
        sessionsDone=done,
        sessionsUpcoming=upcoming,
        learners=learners,
    )


@router.get("/next-session", response_model=NextSession)
def get_next_session(
    db: DbSession, teacher: CurrentTeacher, locale: ReqLocale
) -> NextSession:
    now = datetime.now(UTC)
    lesson = (
        db.query(Lesson)
        .filter(
            Lesson.teacher_id == teacher.id,
            Lesson.starts_at >= now,
            Lesson.status.in_(("confirmed", "pending")),
        )
        .order_by(Lesson.starts_at)
        .first()
    )
    if lesson is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No upcoming session")

    tz = ZoneInfo(teacher.user.timezone)
    completed = (
        db.query(Lesson)
        .filter(
            Lesson.teacher_id == teacher.id,
            Lesson.student_id == lesson.student_id,
            Lesson.status == "completed",
        )
        .count()
    )

    return NextSession(
        inMinutes=max(0, int((lesson.starts_at - now).total_seconds() // 60)),
        at=lesson.starts_at.astimezone(tz).strftime("%H:%M"),
        latency="",
        student=lesson.student.name,
        level=pick(lesson, "level", locale) or lesson.student.level,
        topic=pick(lesson, "topic", locale),
        progress=(
            f"{completed} séance{'s' if completed > 1 else ''} terminée"
            f"{'s' if completed > 1 else ''}"
            if locale == "fr"
            else f"{completed} session{'s' if completed != 1 else ''} completed"
        ),
    )


@router.get("/week", response_model=list[WeekDay])
def get_week(teacher: CurrentTeacher, locale: ReqLocale) -> list[WeekDay]:
    tz = ZoneInfo(teacher.user.timezone)
    today = datetime.now(tz).date()
    monday = today - timedelta(days=today.weekday())
    return [
        WeekDay(
            day=_SHORT_DAYS[locale][i],
            date=(monday + timedelta(days=i)).isoformat(),
            today=(monday + timedelta(days=i)) == today,
        )
        for i in range(7)
    ]


@router.get("/slots", response_model=list[Slot])
def list_slots(
    db: DbSession,
    teacher: CurrentTeacher,
    locale: ReqLocale,
    day: str = Query(default="", description="ISO date; defaults to today"),
) -> list[Slot]:
    tz = ZoneInfo(teacher.user.timezone)
    try:
        target: date = date.fromisoformat(day) if day else datetime.now(tz).date()
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid date") from exc

    now = datetime.now(UTC)
    booked = {
        lesson.starts_at.astimezone(tz).strftime("%H:%M"): lesson
        for lesson in db.query(Lesson)
        .filter(Lesson.teacher_id == teacher.id, Lesson.status != "cancelled")
        .all()
        if lesson.starts_at.astimezone(tz).date() == target
    }

    free = (
        db.query(AvailabilitySlot)
        .filter(AvailabilitySlot.teacher_id == teacher.id, AvailabilitySlot.day == target)
        .order_by(AvailabilitySlot.start_time)
        .all()
    )

    out: list[Slot] = []
    next_marked = False
    for row in free:
        start = row.start_time.strftime("%H:%M")
        lesson = booked.get(start)
        end = (
            datetime.combine(target, row.start_time)
            + timedelta(minutes=lesson.duration_minutes if lesson else 50)
        ).strftime("%H:%M")

        if lesson is None:
            state = "blocked" if row.state == "held" else "open"
        elif lesson.starts_at < now:
            state = "done"
        elif not next_marked:
            state, next_marked = "next", True
        else:
            state = "open"

        out.append(
            Slot(
                id=row.id,
                start=start,
                end=end,
                state=state,
                student=lesson.student.name if lesson else None,
                studentMeta=pick(lesson, "level", locale) if lesson else None,
                title=pick(lesson, "topic", locale)
                if lesson
                else ("Créneau libre" if locale == "fr" else "Open slot"),
                statusLabel=_slot_status_label(state, locale),
            )
        )
    return out


def _slot_status_label(state: str, locale: Locale) -> str:
    labels = {
        "done": ("Terminé", "Done"),
        "next": ("Prochain", "Next"),
        "open": ("Libre", "Open"),
        "blocked": ("Bloqué", "Blocked"),
    }
    fr, en = labels.get(state, (state, state))
    return fr if locale == "fr" else en


@router.get("/learners/filters", response_model=list[RosterFilter])
def list_roster_filters(
    db: DbSession, teacher: CurrentTeacher, locale: ReqLocale
) -> list[RosterFilter]:
    # Declared before /learners/{...} style paths and before the list route's
    # query parsing so "filters" is never read as a learner id.
    statuses = _learner_statuses(db, teacher)
    counts = {key: sum(1 for s in statuses.values() if s == key) for key in
              ("active", "pending", "new", "inactive")}
    counts["all"] = len(statuses)
    return [
        RosterFilter(id=fid, label=t(label, locale), count=counts.get(fid, 0))
        for fid, label in catalog.ROSTER_FILTERS
    ]


def _learner_statuses(db: DbSession, teacher: Teacher) -> dict[str, str]:
    """Classify every learner this teacher has taught.

    Derived from lesson history rather than stored, so it cannot go stale.
    """
    now = datetime.now(UTC)
    rows = db.query(Lesson).filter(Lesson.teacher_id == teacher.id).all()

    by_student: dict[str, list[Lesson]] = {}
    for lesson in rows:
        by_student.setdefault(lesson.student_id, []).append(lesson)

    statuses: dict[str, str] = {}
    for student_id, lessons in by_student.items():
        completed = [x for x in lessons if x.status == "completed"]
        upcoming = [x for x in lessons if x.starts_at >= now and x.status != "cancelled"]
        last = max((x.starts_at for x in completed), default=None)

        if not completed and upcoming:
            statuses[student_id] = "new"
        elif upcoming:
            statuses[student_id] = "active"
        elif last and (now - last) > timedelta(days=30):
            statuses[student_id] = "inactive"
        else:
            statuses[student_id] = "pending"
    return statuses


@router.get("/learners", response_model=list[Learner])
def list_learners(
    db: DbSession,
    teacher: CurrentTeacher,
    locale: ReqLocale,
    status_filter: str | None = Query(default=None, alias="status"),
    query: str | None = Query(default=None, alias="q"),
) -> list[Learner]:
    statuses = _learner_statuses(db, teacher)
    notes = {
        n.student_id: n
        for n in db.query(LearnerNote).filter(LearnerNote.teacher_id == teacher.id).all()
    }

    out: list[Learner] = []
    for student_id, state in statuses.items():
        student = db.get(User, student_id)
        if student is None:
            continue
        if status_filter and status_filter != "all" and state != status_filter:
            continue
        if query and query.lower() not in student.name.lower():
            continue

        lessons = (
            db.query(Lesson)
            .filter(Lesson.teacher_id == teacher.id, Lesson.student_id == student_id)
            .all()
        )
        completed = sum(1 for x in lessons if x.status == "completed")
        total = max(len(lessons), 1)
        note = notes.get(student_id)

        out.append(
            Learner(
                id=student.id,
                name=student.name,
                flag="🇨🇲",
                course=pick(lessons[0], "topic", locale) if lessons else "",
                status=state,
                statusLabel=t(catalog.ROSTER_STATUS_LABELS[state], locale),
                progressLabel=(
                    f"{completed}/{total} séances" if locale == "fr"
                    else f"{completed}/{total} sessions"
                ),
                progress=completed / total,
                when=_last_seen(lessons, locale),
                whenIcon="schedule",
                note=note.body if note else None,
                noteKind=note.kind if note else None,
                attachment=(
                    LearnerAttachment(**note.attachment)
                    if note and note.attachment
                    else None
                ),
            )
        )
    return out


def _last_seen(lessons: list[Lesson], locale: Locale) -> str:
    done = [x for x in lessons if x.status == "completed"]
    if not done:
        return "Jamais" if locale == "fr" else "Never"
    days = (datetime.now(UTC) - max(x.starts_at for x in done)).days
    if days == 0:
        return "Aujourd'hui" if locale == "fr" else "Today"
    if days == 1:
        return "Hier" if locale == "fr" else "Yesterday"
    return f"Il y a {days} jours" if locale == "fr" else f"{days} days ago"


@router.get("/resources", response_model=list[Resource])
def list_resources(locale: ReqLocale) -> list[Resource]:
    return [
        Resource(
            id=r["id"],
            icon=r["icon"],
            title=t(r["title"], locale),
            hint=t(r["hint"], locale),
        )
        for r in catalog.TEACHER_RESOURCES
    ]


@router.get("/earnings", response_model=Earnings)
def get_earnings(db: DbSession, teacher: CurrentTeacher, locale: ReqLocale) -> Earnings:
    now = datetime.now(UTC)
    entries = db.query(LedgerEntry).filter(LedgerEntry.teacher_id == teacher.id).all()

    available = sum(e.teacher_payable_xaf for e in entries if e.state == "payable")
    escrow = sum(e.teacher_payable_xaf for e in entries if e.state == "held")
    month_entries = [e for e in entries if e.created_at >= _month_start(now)]
    month_total = sum(e.teacher_payable_xaf for e in month_entries)

    # Last 7 days of earnings, oldest first -- a single-series bar chart.
    weekly: list[RevenuePoint] = []
    for offset in range(6, -1, -1):
        day = (now - timedelta(days=offset)).date()
        value = sum(
            e.teacher_payable_xaf for e in entries if e.created_at.date() == day
        )
        weekly.append(RevenuePoint(label=_SHORT_DAYS[locale][day.weekday()], value=value))

    accounts = (
        db.query(PayoutAccount).filter(PayoutAccount.teacher_id == teacher.id).all()
    )

    return Earnings(
        wallet=Wallet(
            available=available,
            escrow=escrow,
            monthTotal=month_total,
            sessionsCompleted=len([e for e in month_entries if e.lesson_id]),
            nextAutoPayout=(now + timedelta(days=(4 - now.weekday()) % 7)).date().isoformat(),
            monthLabel=_MONTHS[locale][now.month - 1].capitalize(),
            trend="",
        ),
        accounts=[
            PayoutAccountOut(
                id=a.id,
                initial=a.label[:1].upper(),
                name=a.label,
                tag=a.provider,
                masked=a.masked_number,
                verified=a.is_verified,
            )
            for a in accounts
        ],
        weekly=weekly,
        sources=[
            RevenueSource(
                id="lessons",
                label="Leçons 1:1" if locale == "fr" else "1:1 lessons",
                share=1.0,
                amount=month_total,
            )
        ],
        movements=[
            Movement(
                id=e.id,
                icon="payments",
                title="Séance" if locale == "fr" else "Session",
                meta=e.created_at.date().isoformat(),
                amount=e.teacher_payable_xaf,
                state=e.state,
            )
            for e in sorted(entries, key=lambda x: x.created_at, reverse=True)[:20]
        ],
    )


@router.post("/payouts", response_model=PayoutOut, status_code=status.HTTP_201_CREATED)
def request_payout(
    body: PayoutIn, db: DbSession, teacher: CurrentTeacher, user: CurrentUser
) -> PayoutOut:
    """Withdraw settled earnings.

    Money going out to the teacher, not a purchase, so this is fine on a mobile
    route -- it offers the user nothing to buy.
    """
    account = db.get(PayoutAccount, body.accountId)
    if account is None or account.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payout account not found")
    if not account.is_verified:
        raise HTTPException(status.HTTP_409_CONFLICT, "Payout account is not verified")

    payable = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.teacher_id == teacher.id, LedgerEntry.state == "payable")
        .with_for_update()
        .all()
    )
    available = sum(e.teacher_payable_xaf for e in payable)
    if body.amount > available:
        raise HTTPException(status.HTTP_409_CONFLICT, "Amount exceeds available balance")

    payout = Payout(
        teacher_id=teacher.id,
        amount_xaf=body.amount,
        destination=account.provider,
        destination_number=account.masked_number,
    )
    db.add(payout)
    db.flush()

    # Attach entries until the requested amount is covered, so the payout is
    # always backed by specific ledger rows rather than a floating number.
    remaining = body.amount
    for entry in sorted(payable, key=lambda e: e.created_at):
        if remaining <= 0:
            break
        entry.state = "paid"
        entry.payout_id = payout.id
        remaining -= entry.teacher_payable_xaf

    db.commit()
    return PayoutOut(ref=f"WD-{payout.id[:8].upper()}")
