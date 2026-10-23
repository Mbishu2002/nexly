from fastapi import APIRouter

from app.api.v1.routes import (
    application,
    auth,
    booking,
    classroom,
    groups,
    learner,
    lessons,
    media,
    onboarding,
    payments,
    quizzes,
    teacher_portal,
    teachers,
    threads,
    ws,
)

api_router = APIRouter(prefix="/v1")

# Public
api_router.include_router(onboarding.router)
api_router.include_router(auth.router)
api_router.include_router(teachers.router)

# Learner
api_router.include_router(learner.router)
api_router.include_router(lessons.router)
api_router.include_router(threads.router)
api_router.include_router(booking.router)
api_router.include_router(quizzes.router)
api_router.include_router(groups.router)
api_router.include_router(media.router)

# Live messaging over WebSocket.
api_router.include_router(ws.router)

# Shared live session
api_router.include_router(classroom.router)

# Teacher
api_router.include_router(teacher_portal.router)
api_router.include_router(application.router)

# Web-only surface. Kept last and clearly separated: the mobile app must never
# call these, and must never show a price or a link to them.
api_router.include_router(payments.router)
