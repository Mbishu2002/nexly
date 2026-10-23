"""Web-only checkout and the Fapshi webhook.

Nothing here is reachable from the mobile app, and nothing here should ever be
linked to from it. Every route lives under /v1/web or /v1/webhooks so the split
is obvious in logs, in the router table, and to anyone reviewing the app
against Apple's in-app purchase rules.
"""

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models import Payment, User
from app.schemas import CheckoutIn, CheckoutOut
from app.services import fapshi

router = APIRouter(tags=["payments (web only)"])

# Lesson packages. Prices live server-side and are served only to the web app.
PACKAGES: dict[str, dict] = {
    "trial": {"amount_xaf": 2000, "credits": 1},
    "pack5": {"amount_xaf": 30000, "credits": 5},
    "pack10": {"amount_xaf": 55000, "credits": 10},
}


@router.post("/web/checkout", response_model=CheckoutOut)
async def start_checkout(body: CheckoutIn, db: DbSession, user: CurrentUser) -> CheckoutOut:
    package = PACKAGES.get(body.packageId)
    if package is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown package")

    payment = Payment(
        user_id=user.id,
        provider="fapshi",
        # Replaced with Fapshi's transId once it answers; unique until then.
        provider_ref=f"pending-{user.id[:8]}-{body.packageId}",
        amount_xaf=package["amount_xaf"],
        credits=package["credits"],
    )
    db.add(payment)
    db.flush()

    try:
        result = await fapshi.initiate_payment(
            amount_xaf=package["amount_xaf"],
            phone=body.phone,
            email=user.email,
            external_id=payment.id,
        )
    except fapshi.FapshiError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Payment provider error: {exc}") from exc

    payment.provider_ref = result.get("transId", payment.provider_ref)
    payment.raw_payload = result
    db.commit()

    return CheckoutOut(
        paymentId=payment.id,
        paymentUrl=result.get("link", ""),
        status=payment.status,
    )


@router.post("/webhooks/fapshi", status_code=status.HTTP_200_OK)
async def fapshi_webhook(
    request: Request,
    db: DbSession,
    x_fapshi_signature: str | None = Header(default=None, alias="X-Fapshi-Signature"),
) -> dict[str, str]:
    raw = await request.body()

    if not settings.fapshi_webhook_secret and settings.env != "local":
        # Refuse to run unauthenticated outside local development.
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Webhook secret is not configured"
        )
    if not fapshi.verify_webhook_signature(raw, x_fapshi_signature):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Bad signature")

    body = await request.json()
    trans_id = body.get("transId")
    if not trans_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing transId")

    payment = db.query(Payment).filter(Payment.provider_ref == trans_id).one_or_none()
    if payment is None:
        # 200 so Fapshi stops retrying something we will never recognise.
        return {"status": "ignored"}

    # The callback only says "something changed" -- ask Fapshi what the truth
    # is rather than trusting an amount or status from the request body.
    truth = await fapshi.get_payment_status(trans_id)
    new_status = truth.get("status", "pending").lower()

    # Credits are granted exactly once, however many times this fires. Fapshi
    # retries on non-2xx and may deliver the same event more than once, so the
    # transition -- not the arrival of the callback -- is what grants credit.
    became_successful = new_status == "successful" and payment.status != "successful"

    payment.status = new_status
    payment.raw_payload = truth

    if became_successful:
        account = db.get(User, payment.user_id)
        if account is not None:
            account.pass_credits += payment.credits

    db.commit()
    return {"status": payment.status}
