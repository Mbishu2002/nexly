"""Cloudflare R2 object storage.

R2 speaks the S3 API, so boto3 drives it. Two rules shape this module:

1. **The server never proxies bytes.** Clients upload straight to R2 with a
   presigned PUT and play back through a presigned GET. Streaming video
   through FastAPI would turn the API into the bottleneck and the bill.
2. **Nothing is public.** Paid lesson video must not be shareable as a plain
   link, so playback URLs are signed and short-lived.
"""

from __future__ import annotations

import logging
import mimetypes
import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from app.core.config import settings

log = logging.getLogger(__name__)

# What a learner or teacher is allowed to upload, by asset kind.
ALLOWED_TYPES: dict[str, set[str]] = {
    "lesson_intro": {"video/mp4", "video/quicktime", "video/webm"},
    "course_lesson": {"video/mp4", "video/quicktime", "video/webm"},
    "homework_audio": {"audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav"},
    "report_evidence": {"image/jpeg", "image/png", "video/mp4"},
}


class StorageNotConfigured(RuntimeError):
    pass


@dataclass(frozen=True)
class PresignedUpload:
    url: str
    key: str
    headers: dict[str, str]
    expires_in: int


@lru_cache
def _client() -> Any:
    if not settings.r2_access_key_id or not settings.r2_account_id:
        raise StorageNotConfigured("R2 credentials are not configured")

    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        # R2 implements SigV4 and ignores the region, but botocore insists on
        # one being set.
        config=Config(signature_version="s3v4", region_name="auto"),
    )


def build_key(kind: str, owner_id: str, filename: str) -> str:
    """A collision-proof key that keeps the original extension.

    The uploader's filename is never used as the key: it is attacker-controlled
    and would allow overwriting someone else's object.
    """
    suffix = ""
    if "." in filename:
        candidate = filename.rsplit(".", 1)[-1].lower()
        if candidate.isalnum() and len(candidate) <= 5:
            suffix = f".{candidate}"
    return f"{kind}/{owner_id}/{uuid.uuid4().hex}{suffix}"


def validate_upload(kind: str, content_type: str, size_bytes: int) -> None:
    allowed = ALLOWED_TYPES.get(kind)
    if allowed is None:
        raise ValueError(f"Unknown asset kind: {kind}")
    if content_type not in allowed:
        raise ValueError(f"{content_type} is not allowed for {kind}")
    if size_bytes <= 0:
        raise ValueError("Size must be positive")
    if size_bytes > settings.max_upload_bytes:
        raise ValueError("File is too large")


def presign_upload(*, key: str, content_type: str, size_bytes: int) -> PresignedUpload:
    """A one-shot PUT URL.

    `ContentType` and `ContentLength` are part of the signature, so the client
    cannot upload a 2GB executable against a URL issued for a 5MB audio clip.
    """
    ttl = settings.upload_url_ttl_seconds
    url = _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket,
            "Key": key,
            "ContentType": content_type,
            "ContentLength": size_bytes,
        },
        ExpiresIn=ttl,
    )
    return PresignedUpload(
        url=url,
        key=key,
        headers={"Content-Type": content_type, "Content-Length": str(size_bytes)},
        expires_in=ttl,
    )


def presign_playback(key: str, ttl: int | None = None) -> str:
    """A short-lived GET URL. This is the only way media is served."""
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket, "Key": key},
        ExpiresIn=ttl or settings.playback_url_ttl_seconds,
    )


def head_object(key: str) -> dict | None:
    """Confirm an object exists and read its real size and type.

    Used after a client claims an upload finished: the claim is not evidence,
    and a row marked `uploaded` with nothing behind it would break playback
    later and confusingly.
    """
    try:
        return _client().head_object(Bucket=settings.r2_bucket, Key=key)
    except Exception:
        return None


def delete_object(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.r2_bucket, Key=key)
    except Exception:
        log.warning("could not delete %s", key, exc_info=True)


def guess_content_type(filename: str) -> str:
    return mimetypes.guess_type(filename)[0] or "application/octet-stream"
