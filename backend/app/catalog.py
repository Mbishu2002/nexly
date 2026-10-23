"""Static bilingual reference data.

These are catalogue values, not user data: the heritage languages Nexly
teaches, the onboarding questions, lesson formats, roster filters and the
moderation taxonomy. They change with product decisions, not with traffic, so
they live in code and are resolved per request like everything else.

Copy is kept in step with `frontend/lib/api/fixtures.ts` so the app looks the
same whether it is running on the mock adapter or on this server.
"""

from __future__ import annotations

from app.core.i18n import Locale

# (fr, en) pairs throughout. `t` picks one.
Pair = tuple[str, str]


def t(pair: Pair, locale: Locale) -> str:
    return pair[0] if locale == "fr" else pair[1]


LANGUAGES: list[dict] = [
    {
        "slug": "douala",
        "name": ("Douala", "Douala"),
        "region": ("Sawa / Littoral", "Sawa / Littoral"),
        "tutors": 38,
        "blurb": (
            "Idéal pour le commerce, la musique et les liens familiaux à Douala & diaspora.",
            "Ideal for trade, music and family ties in Douala and the diaspora.",
        ),
        "icon": "headphones",
        "popular": True,
    },
    {
        "slug": "ewondo",
        "name": ("Ewondo", "Ewondo"),
        "region": ("Fang-Beti / Centre", "Fang-Beti / Centre"),
        "tutors": 24,
        "blurb": (
            "Parlé à Yaoundé et dans la région du Centre. Langue historique de "
            "communication intercommunautaire.",
            "Spoken in Yaoundé and the Centre region. Historically the language of "
            "cross-community trade.",
        ),
        "icon": "auto-stories",
        "popular": False,
    },
    {
        "slug": "medumba",
        "name": ("Bamiléké / Medumba", "Bamileke / Medumba"),
        "region": ("Ouest", "West"),
        "tutors": 19,
        "blurb": (
            "Traditions royales, chefferies de l'Ouest et dialectes de transmission "
            "générationnelle.",
            "Royal traditions, the western chiefdoms, and dialects passed down through "
            "generations.",
        ),
        "icon": "diversity-3",
        "popular": False,
    },
    {
        "slug": "bassa",
        "name": ("Bassa", "Bassa"),
        "region": ("Littoral & Centre", "Littoral & Centre"),
        "tutors": 14,
        "blurb": (
            "Histoire culturelle profonde, proverbes ancestraux et liens communautaires forts.",
            "Deep cultural history, ancestral proverbs and strong community ties.",
        ),
        "icon": "history-edu",
        "popular": False,
    },
    {
        "slug": "camfranglais",
        "name": ("Camfranglais", "Camfranglais"),
        "region": ("Urbain", "Urban"),
        "tutors": 9,
        "blurb": (
            "Pratique informelle, humour et immersion dans la culture pop citadine camerounaise.",
            "Informal practice, humour and immersion in Cameroonian urban pop culture.",
        ),
        "icon": "forum",
        "popular": False,
    },
]

MOTIVATIONS: list[tuple[str, Pair]] = [
    ("roots", ("Reconnexion aux origines familiales 👨‍👩‍👦",
               "Reconnecting with family roots 👨‍👩‍👦")),
    ("grandparents", ("Conversation fluide avec les grands-parents 🗣️",
                      "Speaking fluently with grandparents 🗣️")),
    ("travel", ("Voyages & séjours au Cameroun ✈️", "Travel and stays in Cameroon ✈️")),
    ("ceremony", ("Préparation de dot & cérémonies traditionnelles 💍",
                  "Preparing dowry and traditional ceremonies 💍")),
    ("culture", ("Apprentissage culturel & chant / musique 🎵",
                 "Cultural learning, song and music 🎵")),
]

LEVELS: list[tuple[str, Pair, Pair]] = [
    ("A0", ("Débutant complet", "Complete beginner"),
     ("Ne parle pas encore la langue", "Does not speak the language yet")),
    ("A1", ("Quelques mots", "A few words"),
     ("Salutations et expressions de base", "Greetings and basic expressions")),
    ("A2", ("Conversation simple", "Simple conversation"),
     ("Échanges courts du quotidien", "Short everyday exchanges")),
    ("B1", ("Intermédiaire", "Intermediate"),
     ("Discussions suivies sur des sujets connus", "Sustained talk on familiar topics")),
]

LESSON_TYPES: list[dict] = [
    {
        "id": "trial",
        "label": ("Séance d'essai", "Trial session"),
        "duration": 25,
        "note": ("Incluse avec le Pass", "Included with the Pass"),
    },
    {
        "id": "single",
        "label": ("Leçon 1:1", "1:1 lesson"),
        "duration": 50,
        "note": ("Format standard", "Standard format"),
    },
    {
        "id": "group",
        "label": ("Session de groupe", "Group session"),
        "duration": 60,
        "note": ("Jusqu'à 4 apprenants", "Up to 4 learners"),
    },
]

ROSTER_FILTERS: list[tuple[str, Pair]] = [
    ("all", ("Tous", "All")),
    ("active", ("Actifs", "Active")),
    ("pending", ("En attente", "Pending")),
    ("new", ("Nouveaux", "New")),
    ("inactive", ("Inactifs", "Inactive")),
]

ROSTER_STATUS_LABELS: dict[str, Pair] = {
    "active": ("Actif", "Active"),
    "pending": ("En attente", "Pending"),
    "new": ("Nouveau", "New"),
    "inactive": ("Inactif", "Inactive"),
}

TEACHER_RESOURCES: list[dict] = [
    {
        "id": "lesson-plans",
        "icon": "menu-book",
        "title": ("Plans de leçon", "Lesson plans"),
        "hint": ("Modèles Douala & Ewondo par niveau", "Douala & Ewondo templates by level"),
    },
    {
        "id": "audio-bank",
        "icon": "graphic-eq",
        "title": ("Banque audio", "Audio bank"),
        "hint": ("Prononciation par locuteurs natifs", "Native-speaker pronunciation"),
    },
    {
        "id": "community",
        "icon": "groups",
        "title": ("Communauté enseignants", "Teacher community"),
        "hint": ("Échanges et entraide pédagogique", "Peer support and teaching exchange"),
    },
]

# --- Moderation taxonomy. Apple expects a real reporting flow, not a button. ---

REPORT_REASONS: list[dict] = [
    {
        "id": "harassment",
        "label": ("Harcèlement ou intimidation", "Harassment or intimidation"),
        "detail": ("Propos agressifs, menaces, humiliation répétée.",
                   "Aggressive language, threats, repeated humiliation."),
    },
    {
        "id": "inappropriate",
        "label": ("Contenu inapproprié", "Inappropriate content"),
        "detail": ("Nudité, contenu sexuel ou violent pendant la session.",
                   "Nudity, sexual or violent content during the session."),
    },
    {
        "id": "hate",
        "label": ("Discours haineux", "Hate speech"),
        "detail": ("Attaques fondées sur l'origine, l'ethnie, la religion ou le genre.",
                   "Attacks based on origin, ethnicity, religion or gender."),
    },
    {
        "id": "scam",
        "label": ("Arnaque ou paiement hors plateforme", "Scam or off-platform payment"),
        "detail": ("Demande de paiement direct, lien suspect, fausse identité.",
                   "Request for direct payment, suspicious link, false identity."),
    },
    {
        "id": "noshow",
        "label": ("Absence ou session écourtée", "No-show or session cut short"),
        "detail": ("L'enseignant ne s'est pas présenté ou a quitté la session.",
                   "The teacher did not attend or left the session."),
    },
    {
        "id": "other",
        "label": ("Autre motif", "Other reason"),
        "detail": ("Décrivez la situation avec le plus de détails possible.",
                   "Describe the situation in as much detail as you can."),
    },
]

PROTECTIONS: list[dict] = [
    {
        "id": "block",
        "icon": "block",
        "label": ("Bloquer cette personne", "Block this person"),
        "detail": ("Plus aucun message ni réservation entre vous.",
                   "No further messages or bookings between you."),
        "defaultOn": True,
    },
    {
        "id": "hide",
        "icon": "visibility-off",
        "label": ("Masquer mon profil", "Hide my profile"),
        "detail": ("Votre profil n'apparaîtra plus dans ses recherches.",
                   "Your profile will no longer appear in their searches."),
        "defaultOn": False,
    },
    {
        "id": "transcript",
        "icon": "description",
        "label": ("Joindre la transcription", "Attach the transcript"),
        "detail": ("Aide l'équipe modération à agir plus vite.",
                   "Helps the moderation team act faster."),
        "defaultOn": True,
    },
]

REPORT_PROMISE: dict[str, Pair] = {
    "headline": ("Votre signalement est pris au sérieux", "Your report is taken seriously"),
    "body": (
        "Chaque signalement est examiné par une personne, pas par un automate. "
        "Vous recevrez une réponse par e-mail.",
        "Every report is reviewed by a person, not an automated system. "
        "You will receive a reply by email.",
    ),
    "sla": ("Réponse sous 24 heures", "Reply within 24 hours"),
    "compliance": (
        "Conforme aux exigences de modération des stores.",
        "Compliant with app store moderation requirements.",
    ),
}

# Minimum characters before a free-text report can be submitted. Short reports
# are rarely actionable, and this is cheaper than rejecting them after triage.
MIN_REPORT_DETAIL_CHARS = 40
