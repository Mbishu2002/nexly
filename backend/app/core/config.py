from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every knob comes from the environment. See .env.example."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["local", "staging", "production"] = "local"
    debug: bool = True

    # Postgres. Neon in staging/production; docker-compose locally.
    database_url: str = "postgresql+psycopg://nexly:nexly@localhost:5432/nexly"

    # Redis backs Arq for transcoding, payout runs and reminder jobs.
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "dev-only-change-me"
    access_token_ttl_minutes: int = 60 * 24 * 7

    # The Expo app talks to this; the web app handles checkout.
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:8081", "http://localhost:5173"]
    )

    # --- Fapshi (mobile money). Web only -- never called from the mobile app. ---
    fapshi_base_url: str = "https://sandbox.fapshi.com"
    fapshi_api_user: str = ""
    fapshi_api_key: str = ""
    # Fapshi POSTs payment status here; must be publicly reachable.
    fapshi_webhook_secret: str = ""

    # --- LiveKit (live classroom) ---
    livekit_url: str = "wss://localhost:7880"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # Platform take rate, applied when writing the ledger entry for a booking.
    platform_fee_bps: int = 1500  # 15.00%


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
