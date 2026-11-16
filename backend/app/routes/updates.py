import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import require_roles
from ..database import get_db
from ..services.hedera_service import (
    hash_event,
    hashscan_topic_url,
    hashscan_transaction_url,
    submit_event_hash,
)
from .events import ensure_campaign_access, get_campaign_or_404

logger = logging.getLogger(__name__)

router = APIRouter(tags=["campaign updates"])

def serialize_update(item: models.CampaignUpdate) -> dict:
    anchored = item.hedera_status == "confirmed" and bool(item.hedera_transaction_id)
    return {
        "id": item.id,
        "campaign_id": item.campaign_id,
        "kind": item.kind,
        "message": item.message,
        "media_url": item.media_url,
        "created_at": item.created_at,
        "event_hash": item.event_hash,
        "hedera_topic_id": item.hedera_topic_id,
        "hedera_transaction_id": item.hedera_transaction_id,
        "hedera_sequence_number": item.hedera_sequence_number,
        "hedera_status": item.hedera_status,
        "hashscan_tx_url": hashscan_transaction_url(item.hedera_transaction_id) if anchored else None,
        "hashscan_topic_url": hashscan_topic_url(item.hedera_topic_id) if anchored else None,
    }


@router.get("/campaigns/{campaign_id}/updates", response_model=list[schemas.CampaignUpdateRead])
def list_updates(campaign_id: int, db: Session = Depends(get_db)):
    get_campaign_or_404(db, campaign_id)
    rows = (
        db.query(models.CampaignUpdate)
        .filter(models.CampaignUpdate.campaign_id == campaign_id)
        .order_by(models.CampaignUpdate.created_at.desc())
        .all()
    )
    return [serialize_update(row) for row in rows]


@router.post(
    "/campaigns/{campaign_id}/updates",
    response_model=schemas.CampaignUpdateRead,
    status_code=status.HTTP_201_CREATED,
)
def create_update(
    campaign_id: int,
    payload: schemas.CampaignUpdateCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)

    item = models.CampaignUpdate(
        campaign_id=campaign_id,
        kind=payload.kind,
        message=payload.message.strip(),
        media_url=str(payload.media_url) if payload.media_url else None,
        hedera_status="not_anchored",
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Every update is hashed and anchored so the public ledger is complete.
    canonical = {
        "id": item.id,
        "campaign_id": item.campaign_id,
        "kind": item.kind,
        "message": item.message,
        "media_url": item.media_url,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }
    item.event_hash = hash_event(canonical)
    item.hedera_status = "pending"
    try:
        result = submit_event_hash(item.event_hash)
        item.hedera_topic_id = result["topic_id"]
        item.hedera_transaction_id = result["transaction_id"]
        item.hedera_sequence_number = result["sequence_number"]
        item.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera submission failed for campaign update %s", item.id)
        item.hedera_status = "failed"
    db.commit()
    db.refresh(item)

    return serialize_update(item)


@router.get("/campaigns/{campaign_id}/chain", response_model=list[schemas.ChainLink])
def campaign_chain(campaign_id: int, db: Session = Depends(get_db)):
    """Donation-to-delivery chain for a campaign, newest first."""
    get_campaign_or_404(db, campaign_id)
    links: list[dict] = []

    for donation in (
        db.query(models.Donation)
        .filter(
            models.Donation.campaign_id == campaign_id,
            models.Donation.status == "confirmed",
        )
        .all()
    ):
        links.append(
            {
                "stage": "donation",
                "record_id": f"donation-{donation.id}",
                "title": "Donation received",
                "detail": donation.donor_name or "Anonymous donor",
                "amount": donation.amount,
                "created_at": donation.created_at,
                "proof_url": None,
                "hedera_status": donation.hedera_status,
                "hashscan_tx_url": hashscan_transaction_url(donation.hedera_transaction_id),
                "hashscan_topic_url": hashscan_topic_url(donation.hedera_topic_id),
                "anonymous_ref": donation.receipt_token,
            }
        )

    for expense in (
        db.query(models.Expense).filter(models.Expense.campaign_id == campaign_id).all()
    ):
        links.append(
            {
                "stage": "expense",
                "record_id": f"expense-{expense.id}",
                "title": "Funds spent",
                "detail": expense.description,
                "amount": expense.amount,
                "created_at": expense.created_at,
                "proof_url": expense.proof_url,
                "hedera_status": expense.hedera_status,
                "hashscan_tx_url": hashscan_transaction_url(expense.hedera_transaction_id),
                "hashscan_topic_url": hashscan_topic_url(expense.hedera_topic_id),
                "anonymous_ref": None,
            }
        )

    event_stage = {
        "purchase": "expense",
        "shipment": "shipment",
        "arrival": "shipment",
        "distribution": "distribution",
        "completed": "distribution",
    }
    for event in (
        db.query(models.AidEvent)
        .filter(
            models.AidEvent.campaign_id == campaign_id,
            models.AidEvent.review_status == "approved",
        )
        .all()
    ):
        links.append(
            {
                "stage": event_stage.get(event.event_type, "distribution"),
                "record_id": f"event-{event.id}",
                "title": event.event_type.replace("_", " ").title(),
                "detail": event.description,
                "amount": None,
                "created_at": event.created_at,
                "proof_url": event.proof_url,
                "hedera_status": event.hedera_status,
                "hashscan_tx_url": hashscan_transaction_url(event.hedera_transaction_id),
                "hashscan_topic_url": hashscan_topic_url(event.hedera_topic_id),
                "anonymous_ref": None,
            }
        )

    update_stage = {
        "purchase": "expense",
        "shipment": "shipment",
        "distribution": "distribution",
        "update": "update",
        "photo": "update",
        "thanks": "update",
    }
    for update in (
        db.query(models.CampaignUpdate)
        .filter(models.CampaignUpdate.campaign_id == campaign_id)
        .all()
    ):
        links.append(
            {
                "stage": update_stage.get(update.kind, "update"),
                "record_id": f"update-{update.id}",
                "title": update.kind.title(),
                "detail": update.message,
                "amount": None,
                "created_at": update.created_at,
                "proof_url": update.media_url,
                "hedera_status": update.hedera_status,
                "hashscan_tx_url": hashscan_transaction_url(update.hedera_transaction_id),
                "hashscan_topic_url": hashscan_topic_url(update.hedera_topic_id),
                "anonymous_ref": None,
            }
        )

    links.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return links
