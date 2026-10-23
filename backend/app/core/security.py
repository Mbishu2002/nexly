"""Password hashing and access tokens.

Uses `bcrypt` directly rather than passlib, which has been unmaintained since
2020 and does not work with bcrypt 5.x.
"""

import base64
import hashlib
from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def _prepare(raw: str) -> bytes:
    """Reduce a password to a fixed-length token bcrypt can hash safely.

    bcrypt silently truncates at 72 bytes, which would make two long passwords
    that differ only after that point interchangeable. Hashing first means the
    whole password always contributes. Base64 keeps the digest free of NUL
    bytes, which bcrypt also truncates at.
    """
    digest = hashlib.sha256(raw.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(_prepare(raw), bcrypt.gensalt()).decode("ascii")


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(raw), hashed.encode("ascii"))
    except (ValueError, TypeError):
        # A malformed stored hash must read as "wrong password", not blow up.
        return False


def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_ttl_minutes)
    payload: dict = {"sub": subject, "exp": expire, **(extra or {})}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
