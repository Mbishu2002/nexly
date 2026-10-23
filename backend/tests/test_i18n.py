"""The locale contract, which the whole bilingual UI rests on."""

import pytest

from app.core.i18n import DEFAULT_LOCALE, parse_accept_language, pick


class Row:
    headline_fr = "Spécialiste en linguistique"
    headline_en = "Linguistics specialist"
    empty_fr = ""
    empty_en = "Only English"


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        ("fr", "fr"),
        ("en", "en"),
        # Regional tags collapse to the base language.
        ("fr-CM", "fr"),
        ("en-GB", "en"),
        # Full browser header: highest q wins, not first listed.
        ("en;q=0.4,fr;q=0.9", "fr"),
        ("fr;q=0.3,en;q=0.8", "en"),
        ("fr-CM,fr;q=0.9,en;q=0.8", "fr"),
        # Unsupported languages fall back rather than 400.
        ("de,es;q=0.9", DEFAULT_LOCALE),
        ("", DEFAULT_LOCALE),
        (None, DEFAULT_LOCALE),
        # Malformed q must not raise.
        ("fr;q=banana", "fr"),
    ],
)
def test_parse_accept_language(header, expected):
    assert parse_accept_language(header) == expected


def test_equal_quality_prefers_header_order():
    assert parse_accept_language("en,fr") == "en"
    assert parse_accept_language("fr,en") == "fr"


def test_pick_returns_requested_language():
    assert pick(Row(), "headline", "fr") == "Spécialiste en linguistique"
    assert pick(Row(), "headline", "en") == "Linguistics specialist"


def test_pick_falls_back_when_translation_missing():
    # A missing translation should show the other language, never a blank.
    assert pick(Row(), "empty", "fr") == "Only English"
