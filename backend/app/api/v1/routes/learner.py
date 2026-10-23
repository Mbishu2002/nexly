"""Learner-side account routes: the Profile tab and recorded courses."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.i18n import pick
from app.models import Course, CourseProgress
from app.schemas import CourseOut, Student

router = APIRouter(prefix="/me", tags=["learner"])


@router.get("/student", response_model=Student)
def get_student(db: DbSession, user: CurrentUser) -> Student:
    # The languages the learner is actually studying, derived from the courses
    # they have progress in rather than stored twice.
    rows = (
        db.query(Course)
        .join(CourseProgress, CourseProgress.course_id == Course.id)
        .filter(CourseProgress.user_id == user.id)
        .all()
    )
    languages = sorted({c.level for c in rows}) if rows else []

    return Student(
        name=user.name,
        level=user.level,
        streak=user.streak,
        minutesLearned=user.minutes_learned,
        lessonsTaken=user.lessons_taken,
        passCredits=user.pass_credits,
        languages=languages,
    )


@router.get("/courses", response_model=list[CourseOut])
def list_courses(db: DbSession, user: CurrentUser, locale: ReqLocale) -> list[CourseOut]:
    rows = (
        db.query(Course, CourseProgress)
        .outerjoin(
            CourseProgress,
            (CourseProgress.course_id == Course.id) & (CourseProgress.user_id == user.id),
        )
        .filter(Course.is_published.is_(True))
        .all()
    )

    return [
        CourseOut(
            id=course.id,
            title=pick(course, "title", locale),
            teacher=course.teacher_id,
            level=course.level,
            lessons=course.lesson_count,
            completed=progress.completed_lessons if progress else 0,
            minutes=course.minutes_per_lesson,
        )
        for course, progress in rows
    ]
