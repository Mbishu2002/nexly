"""Development seed.

Loads the same content the Expo app's mock adapter serves, so flipping
`USE_MOCK = false` in `frontend/lib/api/index.ts` shows the same screens
against the real server.

    python -m app.db.seed          # idempotent: safe to re-run
    python -m app.db.seed --reset  # drop everything first

Never run this against production: it creates accounts with known passwords.
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models import (
    AvailabilitySlot,
    ChatMessage,
    Course,
    CourseProgress,
    LedgerEntry,
    Lesson,
    LessonBoard,
    PayoutAccount,
    Quiz,
    Review,
    Teacher,
    Thread,
    User,
)

DEV_PASSWORD = "nexly-dev-password"

UNSPLASH = "https://images.unsplash.com/photo-{}?auto=format&fit=crop&crop=faces&w=256&h=256&q=80"
PORTRAITS = {
    "henriette-mbassi": UNSPLASH.format("1573496799515-eebbb63814f2"),
    "marc-aurel-tchouente": UNSPLASH.format("1614023342667-6f060e9d1e04"),
    "nadine-bella": UNSPLASH.format("1573497019418-b400bb3ab074"),
}


def _teacher(db: Session, slug: str, email: str, name: str, city: str,
             headline: tuple[str, str], languages: list[str], rating: float,
             reviews: int) -> Teacher:
    user = db.get(User, f"u-{slug}") or User(
        id=f"u-{slug}",
        email=email,
        name=name,
        password_hash=hash_password(DEV_PASSWORD),
        is_teacher=True,
        timezone="Africa/Douala",
    )
    db.merge(user)

    teacher = Teacher(
        id=slug,
        user_id=user.id,
        name=name,
        avatar_url=PORTRAITS.get(slug),
        city=city,
        headline_fr=headline[0],
        headline_en=headline[1],
        credential_fr="Univ. de Yaoundé I • Linguistique bantoue",
        credential_en="Univ. of Yaoundé I • Bantu linguistics",
        badge_fr="🇨🇲 Locuteur natif",
        badge_en="🇨🇲 Native speaker",
        badge_icon="graphic-eq",
        rating=rating,
        reviews_count=reviews,
        rate_xaf=6500,
        languages=languages,
        tags_fr=["Débutant bienvenu", "Culture"],
        tags_en=["Beginner friendly", "Culture"],
        skills=[
            {"label_fr": lang, "label_en": lang,
             "level_fr": "Natif", "level_en": "Native"}
            for lang in languages[:2]
        ],
        is_verified=True,
        is_published=True,
    )
    return db.merge(teacher)


def seed(db: Session) -> None:
    now = datetime.now(UTC)

    student = db.merge(
        User(
            id="u-franck",
            email="franck@nexly.dev",
            name="Franck Bishu",
            password_hash=hash_password(DEV_PASSWORD),
            level="A2",
            streak=12,
            minutes_learned=640,
            lessons_taken=14,
            pass_credits=4,
            timezone="Africa/Douala",
            locale="fr",
        )
    )

    henriette = _teacher(
        db, "henriette-mbassi", "henriette@nexly.dev", "Dr. Henriette Mbassi", "Yaoundé",
        ("Spécialiste en linguistique Douala & Ewondo",
         "Specialist in Douala & Ewondo linguistics"),
        ["Douala", "Ewondo", "Français"], 4.98, 124,
    )
    _teacher(
        db, "marc-aurel-tchouente", "marc@nexly.dev", "Marc Aurel Tchouente", "Bafoussam",
        ("Medumba & Bamiléké — traditions et conversation",
         "Medumba & Bamileke — traditions and conversation"),
        ["Medumba", "Français", "English"], 4.91, 86,
    )
    nadine = _teacher(
        db, "nadine-bella", "nadine@nexly.dev", "Nadine Bella", "Yaoundé",
        ("Conteuse & professeure d'Ewondo", "Storyteller & Ewondo teacher"),
        ["Ewondo", "Français"], 4.95, 61,
    )
    db.flush()

    db.merge(Review(id="rev-1", teacher_id=henriette.id, author_name="Sandrine K.",
                    rating=5, body="Très pédagogue, j'ai progressé vite."))
    db.merge(Review(id="rev-2", teacher_id=henriette.id, author_name="Eric N.",
                    rating=5, body="Excellent sur les tons."))

    # Two weeks of availability: weekday evenings.
    for offset in range(1, 15):
        day = (now + timedelta(days=offset)).date()
        if day.weekday() >= 5:
            continue
        for hour in (16, 17, 19):
            db.merge(
                AvailabilitySlot(
                    id=f"slot-{henriette.id}-{day}-{hour}",
                    teacher_id=henriette.id,
                    day=day,
                    start_time=time(hour, 0),
                    state="free",
                )
            )

    soon = db.merge(
        Lesson(
            id="lesson-today",
            teacher_id=henriette.id,
            student_id=student.id,
            topic_fr="Douala — salutations & famille",
            topic_en="Douala — greetings & family",
            starts_at=now + timedelta(minutes=8),
            duration_minutes=50,
            status="confirmed",
            language_fr="Douala", language_en="Douala",
            level_fr="Débutant · A2", level_en="Beginner · A2",
            lesson_type_fr="Cours particulier", lesson_type_en="One-to-one lesson",
            objectives_fr=["Saluer selon le moment de la journée",
                           "Présenter les membres de sa famille",
                           "Maîtriser les tons hauts et bas"],
            objectives_en=["Greet according to the time of day",
                           "Introduce your family members",
                           "Master high and low tones"],
            materials=[
                {"id": "m1", "label_fr": "Fiche — 20 salutations",
                 "label_en": "Handout — 20 greetings", "meta_fr": "PDF · 2 pages",
                 "meta_en": "PDF · 2 pages", "icon": "picture-as-pdf"},
                {"id": "m2", "label_fr": "Audio — tons Douala",
                 "label_en": "Audio — Douala tones", "meta_fr": "4 min",
                 "meta_en": "4 min", "icon": "graphic-eq"},
            ],
            teacher_note_fr="Révise les salutations de la dernière fois.",
            teacher_note_en="Review last time's greetings.",
        )
    )
    db.merge(
        Lesson(
            id="lesson-thursday",
            teacher_id=nadine.id,
            student_id=student.id,
            topic_fr="Ewondo — proverbes & contes",
            topic_en="Ewondo — proverbs & tales",
            starts_at=now + timedelta(days=2, hours=3),
            duration_minutes=50,
            status="confirmed",
        )
    )
    db.merge(
        Lesson(
            id="lesson-past",
            teacher_id=henriette.id,
            student_id=student.id,
            topic_fr="Douala — les nombres", topic_en="Douala — numbers",
            starts_at=now - timedelta(days=4),
            duration_minutes=50,
            status="completed",
        )
    )
    db.flush()

    db.merge(
        LessonBoard(
            id="board-today",
            lesson_id=soon.id,
            title_fr="Salutations Douala", title_en="Douala greetings",
            vocab=[
                {"word": "Mbolo", "gloss_fr": "Bonjour", "gloss_en": "Hello"},
                {"word": "Na som", "gloss_fr": "Merci", "gloss_en": "Thank you"},
            ],
            phonetic_guide={"target": "Mbolo", "ipa": "mbɔ.lɔ",
                            "hint_fr": "Ton bas sur les deux syllabes.",
                            "hint_en": "Low tone on both syllables."},
        )
    )

    db.merge(LedgerEntry(id="led-1", lesson_id="lesson-past", teacher_id=henriette.id,
                         gross_xaf=6500, platform_fee_xaf=975,
                         teacher_payable_xaf=5525, state="payable"))
    db.merge(PayoutAccount(id="acct-momo", teacher_id=henriette.id, provider="mtn_momo",
                           label="MTN MoMo", masked_number="•••• 7412",
                           is_verified=True, is_default=True))

    course = db.merge(
        Course(id="douala-foundations", teacher_id=henriette.id,
               title_fr="Douala — fondations", title_en="Douala foundations",
               level="A1", lesson_count=24, minutes_per_lesson=15, is_published=True)
    )
    db.flush()
    db.merge(CourseProgress(id="cp-1", course_id=course.id, user_id=student.id,
                            completed_lessons=11))

    thread = db.merge(Thread(id="thread-henriette", teacher_id=henriette.id,
                             student_id=student.id))
    db.flush()
    db.merge(ChatMessage(id="m-1", thread_id=thread.id, sender_id=henriette.user_id,
                         body="Bonjour Franck ! Prêt pour la session de demain ?",
                         sent_at=now - timedelta(hours=3)))
    db.merge(ChatMessage(id="m-2", thread_id=thread.id, sender_id=student.id,
                         body="Oui ! J'ai révisé le vocabulaire de la famille.",
                         sent_at=now - timedelta(hours=2)))

    db.merge(
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
                    "instruction_fr": "Écoutez l'extrait puis choisissez.",
                    "instruction_en": "Listen to the clip, then choose.",
                    "speaker": {"name": "Dr. Henriette Mbassi",
                                "credential_fr": "Locutrice native",
                                "credential_en": "Native speaker"},
                    "toneHint": {"high_fr": "ton haut", "high_en": "high tone",
                                 "low_fr": "ton bas", "low_en": "low tone"},
                    "clipLength": "0:03",
                    "options": [
                        {"key": "A", "word": "mbolo", "tone": "BB",
                         "meaning_fr": "bonjour", "meaning_en": "hello"},
                        {"key": "B", "word": "mbólo", "tone": "HB",
                         "meaning_fr": "un appel", "meaning_en": "a call"},
                        {"key": "C", "word": "mbòló", "tone": "BH",
                         "meaning_fr": "le silence", "meaning_en": "silence"},
                    ],
                    "correct": "A",
                    "xp": 10,
                    "successLabel_fr": "Bien joué !", "successLabel_en": "Nicely done!",
                    "successHint_fr": "Deux tons bas.", "successHint_en": "Two low tones.",
                    "fact": {"title_fr": "Le saviez-vous ?", "title_en": "Did you know?",
                             "body_fr": "Le douala est une langue à tons : la hauteur change le sens.",
                             "body_en": "Douala is a tonal language: pitch changes meaning."},
                },
            ],
        )
    )

    db.commit()


def main() -> int:
    if settings.env == "production":
        print("Refusing to seed a production database.", file=sys.stderr)
        return 1

    if "--reset" in sys.argv:
        print("Dropping all tables...")
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()

    print("Seeded. Dev accounts (password: " + DEV_PASSWORD + "):")
    print("  learner  franck@nexly.dev")
    print("  teacher  henriette@nexly.dev")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
