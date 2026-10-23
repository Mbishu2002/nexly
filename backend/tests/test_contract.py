"""Guards on the promises the mobile client relies on."""

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import Teacher

client = TestClient(app)


def api_paths() -> list[str]:
    """Every mounted path.

    Read from the OpenAPI schema rather than `app.routes`: FastAPI keeps
    included routers as opaque nodes there, so walking it would silently miss
    every sub-router and make these assertions vacuously pass.
    """
    return list(app.openapi()["paths"])


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_core_routes_are_mounted():
    paths = api_paths()
    for expected in (
        "/v1/auth/login",
        "/v1/teachers",
        "/v1/teachers/{teacher_id}",
        "/v1/me/lessons",
        "/v1/me/lessons/{lesson_id}",
        "/v1/me/threads",
        "/v1/sessions/{lesson_id}/token",
    ):
        assert expected in paths, f"{expected} is not mounted"


def test_teacher_dto_exposes_no_price():
    """Architecture plan section 6: no price may reach the mobile app.

    A rate field here would be rendered by the app and put the iOS build
    under Apple's in-app purchase rules.
    """
    forbidden = {"rate", "price", "amount", "cost", "fee", "rateXaf"}
    assert forbidden.isdisjoint(Teacher.model_fields)


def test_teacher_endpoint_response_has_no_price_field():
    """Same guarantee, asserted on the published schema rather than the class."""
    schema = app.openapi()["components"]["schemas"]["Teacher"]
    leaked = {"rate", "price", "amount", "cost", "fee", "rateXaf"} & set(schema["properties"])
    assert not leaked, f"price-shaped fields leaked to the mobile DTO: {leaked}"


def test_payment_routes_are_namespaced_as_web_only():
    """Checkout stays under /v1/web/ and /v1/webhooks/ so the split is auditable."""
    money = [p for p in api_paths() if "checkout" in p or "webhook" in p]
    assert money, "expected checkout/webhook routes to exist"
    for path in money:
        assert path.startswith(("/v1/web/", "/v1/webhooks/")), (
            f"{path} is not namespaced as web-only"
        )


def test_no_payment_route_sits_on_a_mobile_path():
    """The mobile app reads /v1/teachers, /v1/me/... -- none may touch money."""
    mobile = [
        p for p in api_paths() if p.startswith(("/v1/teachers", "/v1/me", "/v1/sessions"))
    ]
    for path in mobile:
        assert not any(word in path for word in ("checkout", "payment", "price", "webhook")), (
            f"{path} exposes a payment concern on a mobile path"
        )


def test_protected_route_requires_auth():
    assert client.get("/v1/me/lessons").status_code == 401
    assert client.get("/v1/me/threads").status_code == 401


def test_public_routes_do_not_require_auth():
    # Discovery must work before sign-in, so these must not 401.
    assert client.get("/v1/teachers/filters").status_code == 200
