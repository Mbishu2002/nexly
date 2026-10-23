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
