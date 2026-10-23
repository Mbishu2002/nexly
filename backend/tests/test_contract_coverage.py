"""Every route the Expo app calls must exist on this server.

The expected list is parsed out of `frontend/lib/api/httpAdapter.ts` at test
time rather than copied here by hand. A hand-kept list drifts the moment
someone adds a client call and forgets to update it -- which is exactly the
failure this test is supposed to catch.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from app.main import app

ADAPTER = (
    Path(__file__).resolve().parents[2] / "frontend" / "lib" / "api" / "httpAdapter.ts"
)

# `request(...)` is GET unless a method is given; `post(...)` is always POST.
_CALL = re.compile(
    r"""\b(?P<fn>request|post)\s*\(\s*(?P<quote>["'`])(?P<path>/v1[^"'`]*)(?P=quote)"""
    # Stop at the next ADAPTER property, which sits at exactly two spaces of
    # indent. Matching any indented `key:` would stop at the `method:` inside
    # the options object and misread those calls as GET.
    r"""(?P<rest>(?:[^;]|\n)*?)(?=\n  \w+:|\n};)""",
    re.MULTILINE,
)


def client_routes() -> set[tuple[str, str]]:
    """(METHOD, path) for every call in the adapter, with params normalised."""
    source = ADAPTER.read_text(encoding="utf-8")
    found: set[tuple[str, str]] = set()

    for match in _CALL.finditer(source):
        path = match.group("path")
        method = "POST" if match.group("fn") == "post" else "GET"
        if re.search(r"""method:\s*["']POST["']""", match.group("rest") or ""):
            method = "POST"

        path = path.split("?")[0]
        # `${id}` / `${input.quizId}` -> a single placeholder token.
        path = re.sub(r"\$\{[^}]+\}", "{}", path)
        found.add((method, path.rstrip("/")))

    return found


def server_routes() -> set[tuple[str, str]]:
    spec = app.openapi()["paths"]
    out: set[tuple[str, str]] = set()
    for path, ops in spec.items():
        normalised = re.sub(r"\{[^}]+\}", "{}", path)
        for method in ops:
            if method.lower() in {"get", "post", "put", "patch", "delete"}:
                out.add((method.upper(), normalised.rstrip("/")))
    return out


@pytest.mark.skipif(not ADAPTER.exists(), reason="frontend/ not checked out")
def test_adapter_parses():
    """Guard the parser itself: a regex that matches nothing would pass silently."""
    routes = client_routes()
    assert len(routes) >= 30, f"only parsed {len(routes)} routes -- the regex is wrong"
    assert ("GET", "/v1/teachers") in routes
    assert ("POST", "/v1/bookings") in routes


@pytest.mark.skipif(not ADAPTER.exists(), reason="frontend/ not checked out")
def test_every_client_route_is_implemented():
    missing = sorted(client_routes() - server_routes())
    assert not missing, "routes the app calls but the server does not serve:\n" + "\n".join(
        f"  {m} {p}" for m, p in missing
    )


def test_auth_and_livekit_routes_exist():
    """Not reachable from the adapter yet, but required by the product."""
    have = server_routes()
    for pair in (
        ("POST", "/v1/auth/register"),
        ("POST", "/v1/auth/login"),
        ("POST", "/v1/auth/google"),
        ("POST", "/v1/auth/apple"),
        ("POST", "/v1/sessions/{}/token"),
        ("POST", "/v1/sessions/{}/join"),
    ):
        assert pair in have, f"{pair[0]} {pair[1]} is missing"


def test_no_duplicate_methods_on_a_path():
    """A path registered twice means one handler silently shadows the other."""
    spec = app.openapi()["paths"]
    for path, ops in spec.items():
        methods = [m for m in ops if m.lower() in {"get", "post", "put", "patch", "delete"}]
        assert len(methods) == len(set(methods)), f"{path} has duplicate methods"
