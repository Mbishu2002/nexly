"""Response shapes.

These mirror `frontend/lib/api/types.ts` one-for-one. When you change a field
here, change it there -- the Expo app's `httpAdapter` deserializes straight
into those types, so a mismatch is a runtime bug the compiler cannot see.

Every user-facing string is already resolved to the request's locale. No
`{fr, en}` object ever crosses this boundary.
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class ORMModel(BaseModel):
    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=160)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --------------------------------------------------------------------------
# Marketplace
# --------------------------------------------------------------------------


class Skill(BaseModel):
    label: str
    level: str


class Availability(BaseModel):
    label: str
    value: str
    note: str
    icon: str


class Teacher(BaseModel):
    """Teacher as the MOBILE app sees them.

    Deliberately has no price field. The architecture plan (section 6) keeps
    all pricing and checkout on the web so the apps stay outside Apple's in-app
    purchase rules; a rate serialized here would show up in the UI and put the
    build at risk. Web pricing is served by `/v1/web/...` instead.
    """

    id: str
    name: str
    avatar: str | None = None
    headline: str
    city: str
    credential: str
    badge: str
    badgeIcon: str
    rating: float
    reviews: int
    skills: list[Skill]
    tags: list[str]
    availability: Availability
    trial: str
    sampleLabel: str
    sampleIcon: str
    languages: list[str]


class Review(BaseModel):
    id: str
    name: str
    rating: int
    text: str
    when: str


class DiscoveryFilter(BaseModel):
    id: str
    label: str


# --------------------------------------------------------------------------
# Learner
# --------------------------------------------------------------------------


class Student(BaseModel):
    name: str
    level: str
    streak: int
    minutesLearned: int
    lessonsTaken: int
    passCredits: int
    languages: list[str]


class CourseOut(BaseModel):
    id: str
    title: str
    teacher: str
    level: str
    lessons: int
    completed: int
    minutes: int


class Lesson(BaseModel):
    """Summary projection used by the upcoming-lessons list."""

    id: str
    teacher: str
    teacherId: str
    avatar: str | None = None
    topic: str
    date: str
    time: str
    tz: str
    duration: int


class LessonMaterial(BaseModel):
    id: str
    label: str
    meta: str
    icon: str


class LessonDetail(BaseModel):
    id: str
    topic: str
    cover: str | None = None
    teacher: str
    teacherId: str
    avatar: str | None = None
    teacherHeadline: str
    date: str
    time: str
    endTime: str
    tz: str
    duration: int
    status: str
    statusLabel: str
    language: str
    level: str
    lessonType: str
    joinable: bool
    countdown: str
    objectives: list[str]
    materials: list[LessonMaterial]
    teacherNote: str
    policy: str


class RescheduleIn(BaseModel):
    lessonId: str


class RescheduleOut(BaseModel):
    ref: str
    message: str


# --------------------------------------------------------------------------
# Messaging
# --------------------------------------------------------------------------


class Message(BaseModel):
    # "me" | "them", resolved relative to the authenticated caller.
    from_: str = Field(serialization_alias="from")
    text: str
    time: str

    model_config = {"populate_by_name": True}


class Thread(BaseModel):
    id: str
    teacherId: str
    name: str
    avatar: str | None = None
    preview: str
    time: str
    unread: int
    messages: list[Message]


class SendMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


# --------------------------------------------------------------------------
# Booking & classroom
# --------------------------------------------------------------------------


class BookingIn(BaseModel):
    teacherId: str
    lessonTypeId: str
    day: str
    slot: str


class BookingOut(BaseModel):
    id: str
    confirmed: bool


class ClassroomToken(BaseModel):
    """What the client feeds to the LiveKit SDK."""

    url: str
    token: str
    room: str
    identity: str


# --------------------------------------------------------------------------
# Trust & safety
# --------------------------------------------------------------------------


class ReportIn(BaseModel):
    sessionId: str
    reason: str
    detail: str = ""


class ReportOut(BaseModel):
    ref: str
    status: str


# --------------------------------------------------------------------------
# Web-only: pricing and checkout (never called by the mobile app)
# --------------------------------------------------------------------------


class CheckoutIn(BaseModel):
    packageId: str
    phone: str = Field(description="Mobile money number, e.g. 6XXXXXXXX")


class CheckoutOut(BaseModel):
    paymentId: str
    paymentUrl: str
    status: str


# ==========================================================================
# Onboarding catalogue
# ==========================================================================


class Language(BaseModel):
    slug: str
    name: str
    region: str
    tutors: int
    blurb: str
    icon: str
    popular: bool


class Motivation(BaseModel):
    id: str
    label: str


class Level(BaseModel):
    code: str
    label: str
    hint: str


class Onboarding(BaseModel):
    languages: list[Language]
    motivations: list[Motivation]
    levels: list[Level]


# ==========================================================================
# Booking
# ==========================================================================


class DaySlots(BaseModel):
    day: str
    date: str
    slots: list[str]


class LessonType(BaseModel):
    id: str
    label: str
    duration: int
    note: str


class CreateBookingIn(BaseModel):
    teacherId: str
    type: str
    date: str
    slot: str


class CreatedBooking(BaseModel):
    id: str


# ==========================================================================
# Teacher portal
# ==========================================================================


class TeacherProfile(BaseModel):
    name: str
    firstName: str
    badge: str
    status: str
    rating: float
    reviews: int
    hoursThisMonth: int
    sessionsToday: int
    sessionsDone: int
    sessionsUpcoming: int
    learners: int


class NextSession(BaseModel):
    inMinutes: int
    at: str
    latency: str
    student: str
    level: str
    topic: str
    progress: str


class Slot(BaseModel):
    id: str
    start: str
    end: str
    state: str  # "done" | "next" | "open" | "blocked"
    student: str | None = None
    studentMeta: str | None = None
    title: str
    note: str | None = None
    noteIcon: str | None = None
    statusLabel: str


class WeekDay(BaseModel):
    day: str
    date: str
    today: bool


class LearnerAttachment(BaseModel):
    label: str
    duration: str


class Learner(BaseModel):
    id: str
    name: str
    flag: str
    course: str
    status: str  # "active" | "pending" | "new" | "inactive"
    statusLabel: str
    progressLabel: str
    progress: float | None = None
    when: str
    whenIcon: str
    note: str | None = None
    noteKind: str | None = None
    attachment: LearnerAttachment | None = None


class RosterFilter(BaseModel):
    id: str
    label: str
    count: int


class Resource(BaseModel):
    id: str
    icon: str
    title: str
    hint: str


# ==========================================================================
# Earnings & payouts
#
# A payout is money going OUT to a teacher, not a purchase, so unlike student
# checkout these legitimately live on a mobile route: nothing here offers the
# user anything to buy.
# ==========================================================================


class Wallet(BaseModel):
    available: int
    escrow: int
    monthTotal: int
    sessionsCompleted: int
    nextAutoPayout: str
    monthLabel: str
    trend: str


class PayoutAccount(BaseModel):
    id: str
    initial: str
    name: str
    tag: str
    masked: str
    verified: bool


class RevenuePoint(BaseModel):
    label: str
    value: int


class RevenueSource(BaseModel):
    id: str
    label: str
    share: float
    amount: int


class Movement(BaseModel):
    id: str
    icon: str
    title: str
    meta: str
    amount: int
    state: str


class Earnings(BaseModel):
    wallet: Wallet
    accounts: list[PayoutAccount]
    weekly: list[RevenuePoint]
    sources: list[RevenueSource]
    movements: list[Movement]


class PayoutIn(BaseModel):
    accountId: str
    amount: int = Field(gt=0)


class PayoutOut(BaseModel):
    ref: str


# ==========================================================================
# Teacher application
# ==========================================================================


class ApplicationStep(BaseModel):
    label: str
    done: bool
    current: bool


class ApplicationVideo(BaseModel):
    duration: str
    quality: str
    audio: str
    file: str
    size: str


class ApplicationDoc(BaseModel):
    id: str
    icon: str
    title: str
    hint: str
    verified: bool


class ApplicationLanguage(BaseModel):
    name: str
    level: str


class Application(BaseModel):
    steps: list[ApplicationStep]
    video: ApplicationVideo
    guidance: list[str]
    docs: list[ApplicationDoc]
    languages: list[ApplicationLanguage]
    basins: list[str]


class ApplicationSubmitted(BaseModel):
    status: str = "pending"


# ==========================================================================
# Live classroom
# ==========================================================================


class VocabItem(BaseModel):
    word: str
    gloss: str


class SessionNote(BaseModel):
    from_: str = Field(serialization_alias="from")  # "teacher" | "me"
    author: str
    text: str

    model_config = {"populate_by_name": True}


class PhoneticGuide(BaseModel):
    target: str
    ipa: str
    hint: str


class ClassroomSession(BaseModel):
    id: str
    teacher: str
    student: str
    elapsedSeconds: int
    lengthSeconds: int
    latency: str
    boardTitle: str
    vocab: list[VocabItem]
    phoneticGuide: PhoneticGuide
    notes: list[SessionNote]


# ==========================================================================
# Post-session review
# ==========================================================================


class Highlight(BaseModel):
    id: str
    label: str


class SessionSummary(BaseModel):
    id: str
    teacher: str
    teacherId: str
    credential: str
    duration: int
    subject: str
    when: str
    highlights: list[Highlight]
    remainingSessions: int


class SubmitReviewIn(BaseModel):
    sessionId: str
    rating: int = Field(ge=1, le=5)
    highlights: list[str] = Field(default_factory=list)
    comment: str = ""
    showProfile: bool = True


class CreatedReview(BaseModel):
    id: str


# ==========================================================================
# Quiz
# ==========================================================================


class QuizOption(BaseModel):
    key: str  # "A" | "B" | "C"
    word: str
    tone: str
    meaning: str


class QuizFact(BaseModel):
    title: str
    body: str


class ToneHint(BaseModel):
    high: str
    low: str


class QuizSpeaker(BaseModel):
    name: str
    credential: str


class Question(BaseModel):
    id: str
    prompt: str
    instruction: str
    speaker: QuizSpeaker
    toneHint: ToneHint
    clipLength: str
    options: list[QuizOption]
    correct: str
    xp: int
    successLabel: str
    successHint: str
    fact: QuizFact


class Quiz(BaseModel):
    id: str
    title: str
    hearts: int
    startingXp: int
    startIndex: int
    questions: list[Question]


class QuizResultIn(BaseModel):
    quizId: str
    xp: int = Field(ge=0)
    hearts: int = Field(ge=0)


class QuizResultOut(BaseModel):
    xp: int


# ==========================================================================
# Safety
# ==========================================================================


class ReportReason(BaseModel):
    id: str
    label: str
    detail: str


class Protection(BaseModel):
    id: str
    icon: str
    label: str
    detail: str
    defaultOn: bool


class ReportPromise(BaseModel):
    headline: str
    body: str
    sla: str
    compliance: str


class ReportTarget(BaseModel):
    kind: str
    person: str
    role: str
    subject: str
    ref: str
    when: str
    rtcRoom: str


class ReportAttachment(BaseModel):
    name: str
    size: str


class ReportContext(BaseModel):
    promise: ReportPromise
    target: ReportTarget
    reasons: list[ReportReason]
    protections: list[Protection]
    minDetailChars: int
    attachment: ReportAttachment


class SubmitReportIn(BaseModel):
    sessionId: str
    reason: str
    details: str = ""
    protections: list[str] = Field(default_factory=list)
    attachment: bool = False


class SubmittedReport(BaseModel):
    ref: str


# ==========================================================================
# OAuth
# ==========================================================================


class OAuthIn(BaseModel):
    """Identity token from Google or Apple, verified server-side."""

    idToken: str
    # Apple returns the display name only on the very first authorization, so
    # the client forwards it once and we persist it.
    name: str | None = None


class ClassroomJoin(BaseModel):
    """LiveKit connection details plus the session state the UI opens with."""

    url: str
    token: str
    room: str
    identity: str
    session: ClassroomSession
