from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession, ReqLocale
from app.core.i18n import Locale
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas import LoginIn, OAuthIn, RegisterIn, Student, TokenOut
from app.services import oauth

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
    if (
        user is None
        or not user.password_hash
        or not verify_password(body.password, user.password_hash)
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    return TokenOut(access_token=create_access_token(user.id))


def _upsert_oauth_user(
    db: DbSession, identity: oauth.OAuthIdentity, locale: Locale
) -> User:
    """Find or create the account behind a verified provider identity.

    Matching is on (provider, subject) first. The provider's subject is stable
    and unique; an email is not -- it can change, and Apple's Hide My Email
    issues a different relay address per app. Email is only used to *link* a
    provider to an existing password account, and only when the provider says
    it verified that address, so a provider cannot be used to take over an
    account by asserting someone else's email.
    """
    user = (
        db.query(User)
        .filter(User.oauth_provider == identity.provider, User.oauth_subject == identity.subject)
        .one_or_none()
    )
    if user:
        return user

    if identity.email and identity.email_verified:
        user = db.query(User).filter(User.email == identity.email.lower()).one_or_none()
        if user:
            user.oauth_provider = identity.provider
            user.oauth_subject = identity.subject
            db.commit()
            return user

    # Apple's Hide My Email means we may have no usable address; synthesise a
    # stable placeholder so the unique constraint still holds.
    email = (identity.email or f"{identity.provider}-{identity.subject}@users.nexly.app").lower()

    user = User(
        email=email,
        name=identity.name or email.split("@")[0],
        password_hash=None,  # OAuth-only account: no password to verify.
        oauth_provider=identity.provider,
        oauth_subject=identity.subject,
        locale=locale,
    )
    db.add(user)
    db.commit()
    return user


@router.post("/google", response_model=TokenOut)
async def google_sign_in(body: OAuthIn, db: DbSession, locale: ReqLocale) -> TokenOut:
    try:
        identity = await oauth.verify_google(body.idToken)
    except oauth.OAuthError as exc:
        # Deliberately vague: the detail would help someone probe the verifier.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in failed") from exc

    user = _upsert_oauth_user(db, identity, locale)
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/apple", response_model=TokenOut)
async def apple_sign_in(body: OAuthIn, db: DbSession, locale: ReqLocale) -> TokenOut:
    """Sign in with Apple.

    Required by App Review as soon as any other third-party login is offered,
    so this ships alongside Google rather than after it.
    """
    try:
        identity = await oauth.verify_apple(body.idToken, fallback_name=body.name)
    except oauth.OAuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Apple sign-in failed") from exc

    user = _upsert_oauth_user(db, identity, locale)
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
