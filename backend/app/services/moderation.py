"""Automated content moderation.

Two tiers, matching §8 of the architecture plan:

1. a hosted classifier when `MODERATION_API_URL` is configured
2. otherwise a local heuristic

The heuristic is deliberately narrow. It catches the things that are
unambiguous in this product -- a teacher steering a student to pay off-platform,
contact details swapped to move the relationship elsewhere, a handful of slurs
-- and nothing subtle. It is a floor, not a substitute for the hosted
classifier or for human review, and it should never be described as one.

Nothing here auto-bans. The strongest action is withholding one message and
opening a flag for a human.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import ModerationFlag

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Verdict:
    category: str = ""
    score: float = 0.0
    source: str = "heuristic"
    matched: list[str] = field(default_factory=list)

    @property
    def flagged(self) -> bool:
        return self.score >= settings.moderation_flag_threshold

    @property
    def blocked(self) -> bool:
        return self.score >= settings.moderation_block_threshold


# --- Heuristic patterns ----------------------------------------------------
#
# Scores are coarse on purpose. "payment off platform" scores high because it
# is both common and directly against the marketplace's interest; everything
# else sits below the block threshold so a person decides.

_PATTERNS: list[tuple[str, float, re.Pattern[str]]] = [
    (
        "off_platform_payment",
        0.90,
        re.compile(
            r"\b(?:pay|paye[rz]?|envoie[rz]?|send)\b[^.\n]{0,40}"
            r"\b(?:momo|mtn|orange\s*money|western\s*union|直接|directly|direct)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "contact_exchange",
        0.60,
        # A Cameroonian mobile number, with or without the +237 prefix.
        re.compile(r"(?:\+?237)?\s?6\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}"),
    ),
    (
        "contact_exchange",
        0.55,
        re.compile(r"\b(?:whats\s?app|telegram|signal|wechat)\b", re.IGNORECASE),
    ),
    (
        "harassment",
        0.70,
        re.compile(
            r"\b(?:idiot|stupide|imb[ée]cile|connard|salope|bitch|moron)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "sexual",
        0.75,
        re.compile(r"\b(?:nude|naked|sexe?|porn|nue?s?)\b", re.IGNORECASE),
    ),
]


def classify_text(text: str) -> Verdict:
    """Score a piece of user text. Never raises."""
    if not text or not text.strip():
        return Verdict()

    best = Verdict()
    matched: list[str] = []
    for category, score, pattern in _PATTERNS:
        found = pattern.search(text)
        if not found:
            continue
        matched.append(found.group(0)[:60])
        if score > best.score:
            best = Verdict(category=category, score=score, source="heuristic")

    if not matched:
        return Verdict()
    return Verdict(
        category=best.category, score=best.score, source="heuristic", matched=matched
    )


async def classify_text_remote(text: str) -> Verdict:
    """Hosted classifier, falling back to the heuristic.

    A moderation outage must not mean "everything is fine": falling back keeps
    the floor in place rather than silently disabling the check.
    """
    if not settings.moderation_api_url:
        return classify_text(text)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                settings.moderation_api_url,
                json={"input": text},
                headers={"Authorization": f"Bearer {settings.moderation_api_key}"},
            )
        res.raise_for_status()
        body = res.json()
        category = body.get("category", "")
        score = float(body.get("score", 0.0))
        remote = Verdict(category=category, score=score, source="hosted")
    except Exception:
        log.warning("moderation API unavailable; using heuristic", exc_info=True)
        return classify_text(text)

    # Take whichever is more concerned.
    local = classify_text(text)
    return remote if remote.score >= local.score else local


def record_flag(
    db: Session,
    *,
    subject_type: str,
    subject_id: str,
    user_id: str | None,
    verdict: Verdict,
) -> ModerationFlag:
    """Open a flag for the admin queue. Caller commits."""
    flag = ModerationFlag(
        subject_type=subject_type,
        subject_id=subject_id,
        user_id=user_id,
        category=verdict.category or "unknown",
        score=round(verdict.score, 3),
        source=verdict.source,
        detail="; ".join(verdict.matched)[:1000],
    )
    db.add(flag)
    return flag
