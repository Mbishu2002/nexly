"""Direct-to-R2 uploads and signed playback.

Three steps, so the server never touches the bytes:

    POST /v1/media/uploads      -> presigned PUT, plus an asset id
    (client PUTs straight to R2)
    POST /v1/media/{id}/complete -> we verify the object, then queue transcoding
    GET  /v1/media/{id}          -> short-lived signed playback URL
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.models import DeviceToken, MediaAsset
from app.schemas import (
    DeviceTokenIn,
    MediaAssetOut,
    MediaPlayback,
    UploadRequest,
    UploadTicket,
)
from app.services import storage
from app.services.storage import StorageNotConfigured

router = APIRouter(tags=["media"])


@router.post("/media/uploads", response_model=UploadTicket, status_code=201)
def request_upload(
    body: UploadRequest, db: DbSession, user: CurrentUser
) -> UploadTicket:
    try:
        storage.validate_upload(body.kind, body.contentType, body.sizeBytes)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    # The uploader's filename never becomes the key: it is attacker-controlled
    # and would let one user overwrite another's object.
    key = storage.build_key(body.kind, user.id, body.filename)

    asset = MediaAsset(
        owner_id=user.id,
        kind=body.kind,
        storage_key=key,
        content_type=body.contentType,
        size_bytes=body.sizeBytes,
        status="pending",
    )
    db.add(asset)

    try:
        ticket = storage.presign_upload(
            key=key, content_type=body.contentType, size_bytes=body.sizeBytes
        )
    except StorageNotConfigured as exc:
        db.rollback()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    db.commit()
    return UploadTicket(
        assetId=asset.id,
        uploadUrl=ticket.url,
        headers=ticket.headers,
        expiresIn=ticket.expires_in,
    )


@router.post("/media/{asset_id}/complete", response_model=MediaAssetOut)
async def complete_upload(
    asset_id: str, db: DbSession, user: CurrentUser
) -> MediaAssetOut:
    asset = db.get(MediaAsset, asset_id)
    if asset is None or asset.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")

    # The client saying "done" is a claim, not evidence. Check the object is
    # really there before anything downstream depends on it.
    head = storage.head_object(asset.storage_key)
    if head is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Upload not found in storage")

    asset.size_bytes = int(head.get("ContentLength", asset.size_bytes))
    asset.content_type = head.get("ContentType", asset.content_type)
    asset.status = "uploaded"
    db.commit()

    try:
        from app.worker import enqueue

        await enqueue("transcode_media", asset_id=asset.id)
    except Exception:
        # Redis being down should not lose the upload; the row stays
        # `uploaded` and can be re-queued.
        pass

    return _to_out(asset)


@router.get("/media/{asset_id}", response_model=MediaPlayback)
def get_playback(asset_id: str, db: DbSession, user: CurrentUser) -> MediaPlayback:
    asset = db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")

    # Only the owner for now. Course-entitlement checks land with Phase 2
    # content; until then it is better to refuse than to leak paid media.
    if asset.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your asset")
    if asset.status not in {"uploaded", "ready"}:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Asset is {asset.status}")

    try:
        url = storage.presign_playback(asset.storage_key)
    except StorageNotConfigured as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    return MediaPlayback(
        assetId=asset.id, url=url, expiresIn=asset.renditions and 0 or 3600
    )


def _to_out(asset: MediaAsset) -> MediaAssetOut:
    return MediaAssetOut(
        id=asset.id,
        kind=asset.kind,
        status=asset.status,
        contentType=asset.content_type,
        sizeBytes=asset.size_bytes,
        durationSeconds=asset.duration_seconds,
    )


# --------------------------------------------------------------------------
# Push registration
# --------------------------------------------------------------------------


@router.post("/me/devices", status_code=204)
def register_device(body: DeviceTokenIn, db: DbSession, user: CurrentUser) -> None:
    """Register (or re-home) an FCM token.

    A token can move between accounts when two people share a device, so an
    existing row is reassigned rather than duplicated -- otherwise the
    previous owner keeps receiving the new owner's notifications.
    """
    existing = (
        db.query(DeviceToken).filter(DeviceToken.token == body.token).one_or_none()
    )
    if existing:
        existing.user_id = user.id
        existing.platform = body.platform
        existing.is_active = True
    else:
        db.add(
            DeviceToken(user_id=user.id, token=body.token, platform=body.platform)
        )
    db.commit()


@router.delete("/me/devices/{token}", status_code=204)
def unregister_device(token: str, db: DbSession, user: CurrentUser) -> None:
    row = (
        db.query(DeviceToken)
        .filter(DeviceToken.token == token, DeviceToken.user_id == user.id)
        .one_or_none()
    )
    if row:
        row.is_active = False
        db.commit()
