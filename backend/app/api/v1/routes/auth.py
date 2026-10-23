from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas import LoginIn, RegisterIn, Student, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: DbSession, locale: ReqLocale) -> TokenOut:
    existing = db.query(User).filter(User.email == body.email.lower()).one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=body.email.lower(),
        name=body.name,
        password_hash=hash_password(body.password),
        locale=locale,
    )
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: DbSession) -> TokenOut:
    user = db.query(User).filter(User.email == body.email.lower()).one_or_none()

    # Same error for "no such user" and "wrong password" so the endpoint can't
    # be used to enumerate registered addresses.
    if user is None or not user.password_hash or not verify_password(
        body.password, user.password_hash
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=Student)
def me(user: CurrentUser) -> Student:
    return Student(
        name=user.name,
        level=user.level,
        streak=user.streak,
        minutesLearned=user.minutes_learned,
        lessonsTaken=user.lessons_taken,
        passCredits=user.pass_credits,
        languages=[],
    )
