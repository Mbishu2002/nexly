from fastapi import APIRouter

from app.api.v1.routes import auth, classroom, lessons, payments, teachers, threads

api_router = APIRouter(prefix="/v1")

api_router.include_router(auth.router)
api_router.include_router(teachers.router)
api_router.include_router(lessons.router)
api_router.include_router(threads.router)
api_router.include_router(classroom.router)

# Web-only surface. Kept last and clearly separated: the mobile app must never
# call these, and must never show a price or a link to them.
api_router.include_router(payments.router)
