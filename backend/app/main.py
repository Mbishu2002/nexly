from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title="Nexly API",
    version="0.1.0",
    description=(
        "Backend for Nexly, a language-learning marketplace for Cameroon.\n\n"
        "Clients send `Accept-Language: fr|en`; every response contains plain, "
        "already-translated strings.\n\n"
        "**Payments are web-only.** Routes under `/v1/web` and `/v1/webhooks` "
        "are never called by the mobile apps, which show no prices and no "
        "checkout, keeping them outside Apple's in-app purchase rules."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    # Accept-Language is the locale channel, so it must survive preflight.
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["ops"])
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.env}
