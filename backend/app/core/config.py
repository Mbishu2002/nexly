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

    # --- Sign in with Google / Apple ---
    # These are AUDIENCE values: the OAuth client ids the ID tokens are minted
    # for. Verification fails closed when they are blank.
    google_client_id: str = ""
    apple_client_id: str = ""   # the app's bundle id, e.g. com.nexly.app

    # --- LiveKit (live classroom) ---
    livekit_url: str = "wss://localhost:7880"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # --- Cloudflare R2 (S3-compatible object storage) ---
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "nexly-media"
    # Public CDN hostname in front of the bucket. Signed URLs are issued
    # against it so paid media cannot be shared as a plain link.
    r2_public_base_url: str = ""
    upload_url_ttl_seconds: int = 900
    playback_url_ttl_seconds: int = 3600
    max_upload_bytes: int = 512 * 1024 * 1024

    # --- Resend (transactional email) ---
    resend_api_key: str = ""
    email_from: str = "Nexly <no-reply@nexly.app>"

    # --- Firebase Cloud Messaging (push) ---
    # Path to the service-account JSON; the file itself is never committed.
    fcm_project_id: str = ""
    fcm_credentials_file: str = ""

    # --- PostHog (product analytics) ---
    posthog_api_key: str = ""
    posthog_host: str = "https://eu.i.posthog.com"

    # --- Moderation ---
    # A hosted classifier endpoint. Empty falls back to the local heuristic,
    # which catches the obvious cases and nothing subtle.
    moderation_api_url: str = ""
    moderation_api_key: str = ""
    moderation_block_threshold: float = 0.85
    moderation_flag_threshold: float = 0.50

    # --- Group sessions ---
    # The architecture plan caps MVP group size; above this is Phase 2.
    max_group_size: int = 6

    # --- Reminders ---
    booking_reminder_lead_minutes: int = 60

    # Platform take rate, applied when writing the ledger entry for a booking.
    platform_fee_bps: int = 1500  # 15.00%

    # How long a ledger entry is held before it becomes payable, covering the
    # refund window and any dispute.
    payout_hold_hours: int = 48


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
