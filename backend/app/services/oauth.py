"""Google and Apple identity-token verification.

The client runs the native sign-in flow, gets an OpenID Connect ID token, and
posts it here. We verify it properly rather than trusting the claims:

1. fetch the provider's JWKS (cached -- keys rotate, but not per request)
2. select the key named by the token's `kid`
3. verify the RS256 signature, the issuer, the audience, and expiry

Skipping any of those turns "sign in with Google" into "sign in as anyone",
since an unverified JWT is just attacker-supplied JSON.

Apple returns the user's name only on the *first* authorization, so the client
forwards it once and we persist it; afterwards the token carries only an email.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import httpx
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import settings

GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"

# Providers publish cache headers, but a flat TTL is enough here and keeps the
# failure mode obvious: at worst one extra fetch after a rotation.
_JWKS_TTL_SECONDS = 3600
_jwks_cache: dict[str, tuple[float, dict]] = {}


class OAuthError(ValueError):
    """Raised when a token cannot be trusted. Never leak details to the client."""


@dataclass(frozen=True)
class OAuthIdentity:
    provider: str
    subject: str
    email: str | None
    name: str | None
    email_verified: bool


async def _fetch_jwks(url: str) -> dict:
    cached = _jwks_cache.get(url)
    now = time.time()
    if cached and now - cached[0] < _JWKS_TTL_SECONDS:
        return cached[1]

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(url)
    if res.status_code != 200:
        raise OAuthError(f"Could not fetch JWKS from {url}")

    jwks = res.json()
    _jwks_cache[url] = (now, jwks)
    return jwks


def _select_key(jwks: dict, token: str) -> dict:
    try:
        kid = jwt.get_unverified_header(token).get("kid")
    except JWTError as exc:
        raise OAuthError("Malformed token") from exc

    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    # A rotated key that isn't in our cached copy lands here.
    raise OAuthError("Unknown signing key")


async def _verify(token: str, *, jwks_url: str, audience: str, issuers: tuple[str, ...]) -> dict:
    if not audience:
        raise OAuthError("Provider client id is not configured")

    key = _select_key(await _fetch_jwks(jwks_url), token)
    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=audience,
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise OAuthError("Token failed verification") from exc

    # python-jose checks `aud` and `exp`; the issuer we check ourselves because
    # Google uses two spellings of it.
    if claims.get("iss") not in issuers:
        raise OAuthError("Unexpected issuer")
    if not claims.get("sub"):
        raise OAuthError("Token has no subject")
    return claims


async def verify_google(id_token: str) -> OAuthIdentity:
    claims = await _verify(
        id_token,
        jwks_url=GOOGLE_JWKS_URL,
        audience=settings.google_client_id,
        issuers=GOOGLE_ISSUERS,
    )
    return OAuthIdentity(
        provider="google",
        subject=claims["sub"],
        email=claims.get("email"),
        name=claims.get("name"),
        # Google sends this as a bool or the string "true" depending on flow.
        email_verified=str(claims.get("email_verified", "false")).lower() == "true",
    )


async def verify_apple(id_token: str, fallback_name: str | None = None) -> OAuthIdentity:
    claims = await _verify(
        id_token,
        jwks_url=APPLE_JWKS_URL,
        audience=settings.apple_client_id,
        issuers=(APPLE_ISSUER,),
    )
    return OAuthIdentity(
        provider="apple",
        subject=claims["sub"],
        email=claims.get("email"),
        # Apple never puts the name in the token; it comes from the client on
        # first authorization only.
        name=fallback_name,
        email_verified=str(claims.get("email_verified", "false")).lower() == "true",
    )
