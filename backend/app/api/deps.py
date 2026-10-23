from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.i18n import Locale, locale_header
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Teacher, User

bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]
ReqLocale = Annotated[Locale, Depends(locale_header)]


def current_user(
    db: DbSession,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)] = None,
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_access_token(creds.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown user")
    if user.is_suspended:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def current_teacher(db: DbSession, user: CurrentUser) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).one_or_none()
    if teacher is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a teacher account")
    return teacher


CurrentTeacher = Annotated[Teacher, Depends(current_teacher)]
