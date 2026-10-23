"""Locale negotiation.

The mobile client sends `Accept-Language: fr` or `en` on every request and
expects plain, already-translated strings back -- it never sees a
`{fr, en}` object. That contract is defined on the client in
`frontend/lib/api/types.ts`; this module is its server half.

Content is stored as paired columns (`*_fr` / `*_en`) and resolved here, once,
at the edge of the request.
"""

from typing import Annotated, Literal

from fastapi import Header

Locale = Literal["fr", "en"]

SUPPORTED: tuple[Locale, ...] = ("fr", "en")

# French is the launch market's language and the source language of the
# designs, so it is the fallback rather than English.
DEFAULT_LOCALE: Locale = "fr"


def parse_accept_language(raw: str | None) -> Locale:
    """Pick the best supported locale from an Accept-Language header.

    Handles the full header grammar ("fr-CM,fr;q=0.9,en;q=0.8"), not just a
    bare tag, because browsers on the web client send the long form.
    """
    if not raw:
        return DEFAULT_LOCALE

    scored: list[tuple[float, int, Locale]] = []
    for index, part in enumerate(raw.split(",")):
        token = part.strip()
        if not token:
            continue

        tag, _, params = token.partition(";")
        quality = 1.0
        if params.strip().startswith("q="):
            try:
                quality = float(params.strip()[2:])
            except ValueError:
                quality = 0.0

        # "fr-CM" -> "fr"; an unsupported tag is simply skipped.
        base = tag.strip().lower().split("-")[0]
        if base in SUPPORTED:
            # `index` breaks ties in header order, keeping the sort stable.
            scored.append((quality, -index, base))  # type: ignore[arg-type]

    if not scored:
        return DEFAULT_LOCALE
    return max(scored)[2]


async def locale_header(
    accept_language: Annotated[str | None, Header(alias="Accept-Language")] = None,
) -> Locale:
    """FastAPI dependency: `locale: Locale = Depends(locale_header)`."""
    return parse_accept_language(accept_language)


def pick(row: object, field: str, locale: Locale) -> str:
    """Read `field_fr` / `field_en` off a model and return the right one.

    Falls back to the other language rather than returning an empty string --
    a missing translation should degrade to showing *something*.
    """
    value = getattr(row, f"{field}_{locale}", None)
    if value:
        return value
    other: Locale = "en" if locale == "fr" else "fr"
    return getattr(row, f"{field}_{other}", "") or ""
