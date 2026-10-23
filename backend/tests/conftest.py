"""Test harness: a real database, seeded, with auth wired up.

Runs on SQLite so the suite needs no services. Model columns use
`JSON().with_variant(JSONB, "postgresql")` and text ids, so the same mappings
work here and on Neon.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, time, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, StaticPool

from app.core.security import create_access_token, hash_password
from app.db.session import Base, get_db
from app.main import app
from app.models import (
    AvailabilitySlot,
    ChatMessage,
    Course,
    CourseProgress,
    LedgerEntry,
    Lesson,
    LessonBoard,
    LessonNote,
    PayoutAccount,
    Quiz,
    Review,
    Teacher,
    Thread,
    User,
)


@pytest.fixture(name="engine")
def engine_fixture():
    """SQLite by default so the suite needs no services.

    Set TEST_DATABASE_URL to run the same tests against real Postgres, which
    exercises the JSONB and TIMESTAMPTZ paths SQLite cannot:

        TEST_DATABASE_URL=postgresql+psycopg://nexly:nexly@localhost:5432/nexly_test
    """
    url = os.environ.get("TEST_DATABASE_URL")

    if url:
        engine = create_engine(url, poolclass=NullPool)
    else:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        # SQLite ignores foreign keys unless asked; without this the cascade
        # and ondelete behaviour under test would silently not apply.
        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_connection, _):
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture(name="db")
def db_fixture(engine):
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    yield session
    session.close()


@pytest.fixture(name="client")
def client_fixture(engine, db):
    def override() -> object:
        yield db

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --------------------------------------------------------------------------
# Seed
# --------------------------------------------------------------------------

NOW = datetime.now(UTC)


@pytest.fixture(name="seed")
def seed_fixture(db):
    """A learner, a teacher, and enough history for every endpoint."""
    student = User(
        id="u-student",
        email="franck@example.com",
        name="Franck Bishu",
        password_hash=hash_password("correct horse battery"),
        level="A2",
        streak=5,
        minutes_learned=320,
        lessons_taken=7,
        pass_credits=3,
        timezone="Africa/Douala",
    )
    teacher_user = User(
        id="u-teacher",
        email="henriette@example.com",
        name="Dr. Henriette Mbassi",
        password_hash=hash_password("correct horse battery"),
        is_teacher=True,
        timezone="Africa/Douala",
    )
    outsider = User(
        id="u-outsider",
        email="nosy@example.com",
        name="Nosy Parker",
        password_hash=hash_password("correct horse battery"),
    )
    db.add_all([student, teacher_user, outsider])

    teacher = Teacher(
        id="henriette-mbassi",
        user_id=teacher_user.id,
        name="Dr. Henriette Mbassi",
        city="Yaoundé",
        headline_fr="Spécialiste en linguistique Douala & Ewondo",
        headline_en="Specialist in Douala & Ewondo linguistics",
        credential_fr="Univ. de Yaoundé I",
        credential_en="Univ. of Yaoundé I",
        badge_fr="Locutrice native",
        badge_en="Native speaker",
        rating=4.98,
        reviews_count=124,
        rate_xaf=6500,
        languages=["Douala", "Ewondo", "Français"],
        tags_fr=["Débutant", "Culture"],
        tags_en=["Beginner", "Culture"],
        skills=[{"label_fr": "Douala", "label_en": "Douala",
                 "level_fr": "Natif", "level_en": "Native"}],
        is_verified=True,
        is_published=True,
    )
    unpublished = Teacher(
        id="hidden-teacher",
        user_id=outsider.id,
        name="Not Yet Approved",
        city="Douala",
        headline_fr="Brouillon",
        headline_en="Draft",
        rating=5.0,
        is_published=False,
    )
    db.add_all([teacher, unpublished])
    db.flush()

    db.add(
        Review(
            id="rev-1",
            teacher_id=teacher.id,
            author_id=student.id,
            author_name="Sandrine K.",
            rating=5,
            body="Très pédagogue.",
        )
    )

    # Availability: tomorrow, two free slots and one already held.
    tomorrow = (NOW + timedelta(days=1)).date()
    db.add_all(
        [
            AvailabilitySlot(id="slot-free-1", teacher_id=teacher.id, day=tomorrow,
                             start_time=time(16, 0), state="free"),
            AvailabilitySlot(id="slot-free-2", teacher_id=teacher.id, day=tomorrow,
                             start_time=time(17, 0), state="free"),
            AvailabilitySlot(id="slot-held", teacher_id=teacher.id, day=tomorrow,
                             start_time=time(18, 0), state="held"),
        ]
    )

    # One lesson starting soon (joinable) and one in two days (not).
    soon = Lesson(
        id="lesson-soon",
        teacher_id=teacher.id,
        student_id=student.id,
        topic_fr="Douala — salutations",
        topic_en="Douala — greetings",
        starts_at=NOW + timedelta(minutes=5),
        duration_minutes=50,
        status="confirmed",
        language_fr="Douala", language_en="Douala",
        level_fr="Débutant · A2", level_en="Beginner · A2",
        lesson_type_fr="Cours particulier", lesson_type_en="One-to-one lesson",
        objectives_fr=["Saluer"], objectives_en=["Greet"],
        materials=[{"id": "m1", "label_fr": "Fiche", "label_en": "Handout",
                    "meta_fr": "PDF", "meta_en": "PDF", "icon": "picture-as-pdf"}],
        teacher_note_fr="Révise", teacher_note_en="Review",
    )
    later = Lesson(
        id="lesson-later",
        teacher_id=teacher.id,
        student_id=student.id,
        topic_fr="Ewondo — proverbes",
        topic_en="Ewondo — proverbs",
        starts_at=NOW + timedelta(days=2),
        duration_minutes=50,
        status="confirmed",
    )
    past = Lesson(
        id="lesson-past",
        teacher_id=teacher.id,
        student_id=student.id,
        topic_fr="Douala — famille",
        topic_en="Douala — family",
        starts_at=NOW - timedelta(days=3),
        duration_minutes=50,
        status="completed",
    )
    db.add_all([soon, later, past])
    db.flush()

    db.add(
        LessonBoard(
            id="board-1",
            lesson_id=soon.id,
            title_fr="Salutations", title_en="Greetings",
            vocab=[{"word": "Mbolo", "gloss_fr": "Bonjour", "gloss_en": "Hello"}],
            phonetic_guide={"target": "Mbolo", "ipa": "mbɔ.lɔ",
                            "hint_fr": "ton bas", "hint_en": "low tone"},
        )
    )
    db.add(LessonNote(id="note-1", lesson_id=soon.id, author_id=teacher_user.id,
                      body="Bien joué."))

    db.add_all(
        [
            LedgerEntry(id="led-1", lesson_id=past.id, teacher_id=teacher.id,
                        gross_xaf=6500, platform_fee_xaf=975,
                        teacher_payable_xaf=5525, state="payable"),
            LedgerEntry(id="led-2", lesson_id=soon.id, teacher_id=teacher.id,
                        gross_xaf=6500, platform_fee_xaf=975,
                        teacher_payable_xaf=5525, state="held"),
        ]
    )
    db.add(
        PayoutAccount(id="acct-1", teacher_id=teacher.id, provider="mtn_momo",
                      label="MTN MoMo", masked_number="•••• 7412", is_verified=True)
    )
    db.add(
        PayoutAccount(id="acct-2", teacher_id=teacher.id, provider="orange_money",
                      label="Orange Money", masked_number="•••• 1188", is_verified=False)
    )

    course = Course(
        id="douala-foundations",
        teacher_id=teacher.id,
        title_fr="Douala — fondations", title_en="Douala foundations",
        level="A1", lesson_count=24, minutes_per_lesson=15, is_published=True,
    )
    db.add(course)
    db.flush()
    db.add(CourseProgress(id="cp-1", course_id=course.id, user_id=student.id,
                          completed_lessons=11))

    thread = Thread(id="thread-1", teacher_id=teacher.id, student_id=student.id)
    db.add(thread)
    db.flush()
    db.add_all(
        [
            ChatMessage(id="msg-1", thread_id=thread.id, sender_id=teacher_user.id,
                        body="Prêt pour demain ?", sent_at=NOW - timedelta(hours=2)),
            ChatMessage(id="msg-2", thread_id=thread.id, sender_id=student.id,
                        body="Oui !", sent_at=NOW - timedelta(hours=1)),
        ]
    )

    db.add(
        Quiz(
            id="douala-foundations",
            course_id=course.id,
            title_fr="Tons Douala", title_en="Douala tones",
            hearts=3,
            questions=[
                {
                    "id": "q1",
                    "prompt_fr": "Quel mot entendez-vous ?",
                    "prompt_en": "Which word do you hear?",
                    "instruction_fr": "Écoutez", "instruction_en": "Listen",
                    "speaker": {"name": "Henriette", "credential_fr": "Native",
                                "credential_en": "Native"},
                    "toneHint": {"high_fr": "haut", "high_en": "high",
                                 "low_fr": "bas", "low_en": "low"},
                    "clipLength": "0:03",
                    "options": [
                        {"key": "A", "word": "mbolo", "tone": "LL",
                         "meaning_fr": "bonjour", "meaning_en": "hello"},
                        {"key": "B", "word": "mbólo", "tone": "HL",
                         "meaning_fr": "appel", "meaning_en": "call"},
                    ],
                    "correct": "A",
                    "xp": 10,
                    "successLabel_fr": "Bravo", "successLabel_en": "Nice",
                    "successHint_fr": "Ton bas", "successHint_en": "Low tone",
                    "fact": {"title_fr": "Le saviez-vous", "title_en": "Did you know",
                             "body_fr": "Le Douala est tonal.",
                             "body_en": "Douala is tonal."},
                }
            ],
        )
    )

    db.commit()
    return {
        "student": student,
        "teacher_user": teacher_user,
        "teacher": teacher,
        "outsider": outsider,
        "lesson_soon": soon,
        "lesson_later": later,
        "lesson_past": past,
        "thread": thread,
    }


def auth(user_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.fixture(name="as_student")
def as_student_fixture(seed):
    return auth(seed["student"].id)


@pytest.fixture(name="as_teacher")
def as_teacher_fixture(seed):
    return auth(seed["teacher_user"].id)


@pytest.fixture(name="as_outsider")
def as_outsider_fixture(seed):
    return auth(seed["outsider"].id)
