
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session


from ..database import get_db
from .. import models, schemas

from ..auth import require_roles

import logging

from ..services.hedera_service import (
    hash_donation,
    hash_event,
    submit_donation_hash,
    submit_event_hash,
    verify_topic_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["campaign updates and finance"])


def get_campaign_or_404(db: Session, campaign_id: int):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/events/recent")
def list_recent_events(limit: int = 50, db: Session = Depends(get_db)):
    results = (
        db.query(models.AidEvent, models.Campaign.title.label("campaign_title"))
        .join(models.Campaign, models.AidEvent.campaign_id == models.Campaign.id)
        .order_by(models.AidEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    events_out = []
    for event, campaign_title in results:
        events_out.append({
            "id": event.id,
            "campaign_id": event.campaign_id,
            "campaign_title": campaign_title,
            "event_type": event.event_type,
            "description": event.description,
            "proof_url": event.proof_url,
            "created_at": event.created_at.isoformat() if event.created_at else None,
            "event_hash": event.event_hash,
            "hedera_topic_id": event.hedera_topic_id,
            "hedera_transaction_id": event.hedera_transaction_id,
            "hedera_sequence_number": event.hedera_sequence_number,
            "hedera_status": event.hedera_status,
            "hashscan_tx_url": (
                f"https://hashscan.io/testnet/transaction/{event.hedera_transaction_id}"
                if event.hedera_transaction_id
                else None
            ),
            "hashscan_topic_url": (
                f"https://hashscan.io/testnet/topic/{event.hedera_topic_id}"
                if event.hedera_topic_id
                else None
            ),
            "is_real_onchain": bool(event.hedera_transaction_id and event.hedera_status == "confirmed"),
        })
    donations = (
        db.query(models.Donation, models.Campaign.title.label("campaign_title"))
        .join(models.Campaign, models.Donation.campaign_id == models.Campaign.id)
        .filter(models.Donation.status == "confirmed")
        .order_by(models.Donation.created_at.desc())
        .limit(limit)
        .all()
    )
    for donation, campaign_title in donations:
        events_out.append({
            "id": f"donation-{donation.id}",
            "campaign_id": donation.campaign_id,
            "campaign_title": campaign_title,
            "event_type": "donation",
            "description": f"Donation recorded for {campaign_title}",
            "proof_url": None,
            "created_at": donation.created_at.isoformat() if donation.created_at else None,
            "event_hash": donation.donation_hash,
            "hedera_topic_id": donation.hedera_topic_id,
            "hedera_transaction_id": donation.hedera_transaction_id,
            "hedera_sequence_number": donation.hedera_sequence_number,
            "hedera_status": donation.hedera_status,
            "receipt_token": donation.receipt_token,
            "amount": float(donation.amount),
            "hashscan_tx_url": (
                f"https://hashscan.io/testnet/transaction/{donation.hedera_transaction_id}"
                if donation.hedera_transaction_id else None
            ),
            "is_real_onchain": bool(donation.hedera_transaction_id and donation.hedera_status == "confirmed"),
        })
    events_out.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return events_out[:limit]


@router.get("/campaigns/{campaign_id}/events", response_model=list[schemas.AidEventRead],)
def list_events(campaign_id: int, db: Session = Depends(get_db)):
    get_campaign_or_404(db, campaign_id)
    return (
        db.query(models.AidEvent)
        .filter(models.AidEvent.campaign_id == campaign_id)
        .order_by(models.AidEvent.created_at.desc())
        .all()
    )


@router.post("/campaigns/{campaign_id}/events",response_model=schemas.AidEventRead,status_code=status.HTTP_201_CREATED,)
def create_event(
    campaign_id: int,
    payload: schemas.AidEventCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400,detail="Campaign ID mismatch")

    event = models.AidEvent(
        campaign_id=campaign_id,
        event_type=payload.event_type,
        description=payload.description,
        proof_url=str(payload.proof_url) if payload.proof_url else None,
        hedera_status="pending",
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    event_data = {
        "id": event.id,
        "campaign_id": event.campaign_id,
        "event_type": event.event_type,
        "description": event.description,
        "proof_url": event.proof_url,
        "created_at": event.created_at.isoformat(),
    }

    event.event_hash = hash_event(event_data)

    try:
        result = submit_event_hash(event.event_hash)

        event.hedera_topic_id = result["topic_id"]
        event.hedera_transaction_id = result["transaction_id"]
        event.hedera_sequence_number = result["sequence_number"]
        event.hedera_status = "confirmed"

    except Exception:
        logger.exception("Hedera submission failed for aid event %s",event.id)
        event.hedera_status = "failed"

    db.commit()
    db.refresh(event)
    return event


@router.get("/campaigns/{campaign_id}/expenses",response_model=list[schemas.ExpenseRead],)
def list_expenses(campaign_id: int, db: Session = Depends(get_db)):
    get_campaign_or_404(db, campaign_id)
    return (db.query(models.Expense).filter(models.Expense.campaign_id == campaign_id).order_by(models.Expense.created_at.desc()).all())


@router.post("/campaigns/{campaign_id}/expenses",response_model=schemas.ExpenseRead,status_code=status.HTTP_201_CREATED,)
def create_expense(campaign_id: int,
    payload: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = get_campaign_or_404(db, campaign_id)

    ensure_campaign_access(campaign, moderator)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")

    expense = models.Expense(
        campaign_id=campaign_id,
        amount=payload.amount,
        description=payload.description,
        proof_url=str(payload.proof_url) if payload.proof_url else None,
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    return expense


@router.get("/campaigns/{campaign_id}/donations", response_model=list[schemas.DonationRead])
def list_campaign_donations(campaign_id: int,db: Session = Depends(get_db),moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),):
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)
    return (db.query(models.Donation).filter(models.Donation.campaign_id == campaign_id).order_by(models.Donation.created_at.desc()).all())


@router.post("/campaigns/{campaign_id}/donations", response_model=schemas.DonationRead, status_code=status.HTTP_201_CREATED)
def record_donation(campaign_id: int, payload: schemas.DonationCreate, db: Session = Depends(get_db)):
    campaign = get_campaign_or_404(db, campaign_id)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")

    if campaign.status not in ("active", "goal_reached"):
        raise HTTPException(status_code=400, detail="Campaign is not accepting donations")

    donation = models.Donation(
        campaign_id=campaign_id,
        amount=payload.amount,
        donor_name=payload.donor_name,
        status="pending",
        hedera_status="pending",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


@router.post("/campaigns/{campaign_id}/donations/record", response_model=schemas.DonationRead, status_code=status.HTTP_201_CREATED)
def record_confirmed_donation(
    campaign_id: int,
    payload: schemas.DonationCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")
    if campaign.status not in ("active", "goal_reached"):
        raise HTTPException(status_code=400, detail="Campaign is not accepting donations")

    receipt_token = f"AMN-{secrets.token_hex(4).upper()}-PROOF"
    donation = models.Donation(
        campaign_id=campaign_id,
        amount=payload.amount,
        donor_name=payload.donor_name,
        status="confirmed",
        receipt_token=receipt_token,
        hedera_status="pending",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    donation_data = {
        "receipt_token": donation.receipt_token,
        "campaign_id": donation.campaign_id,
        "amount": str(donation.amount),
        "donor_name": donation.donor_name,
        "created_at": donation.created_at.isoformat() if donation.created_at else None,
    }
    donation.donation_hash = hash_donation(donation_data)

    try:
        result = submit_donation_hash(
            receipt_token=donation.receipt_token,
            campaign_id=donation.campaign_id,
            amount=float(donation.amount),
            donation_hash=donation.donation_hash,
        )
        donation.hedera_topic_id = result["topic_id"]
        donation.hedera_transaction_id = result["transaction_id"]
        donation.hedera_sequence_number = result["sequence_number"]
        donation.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera HCS submission failed for donation %s", donation.id)
        donation.hedera_status = "pending"

    db.commit()
    db.refresh(donation)
    return donation


@router.post("/donations/{donation_id}/confirm", response_model=schemas.DonationRead)
def confirm_donation(donation_id: int, db: Session = Depends(get_db), moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin"))):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()

    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")

    campaign = get_campaign_or_404(db, donation.campaign_id)
    ensure_campaign_access(campaign, moderator)

    if donation.status != "pending":
        raise HTTPException(status_code=400, detail="Donation is not pending")

    donation.status = "confirmed"
    donation.receipt_token = secrets.token_urlsafe(32)

    donation_data = {
        "receipt_token": donation.receipt_token,
        "campaign_id": donation.campaign_id,
        "amount": str(donation.amount),
        "created_at": donation.created_at.isoformat() if donation.created_at else None,
    }
    donation.donation_hash = hash_donation(donation_data)

    try:
        result = submit_donation_hash(
            receipt_token=donation.receipt_token,
            campaign_id=donation.campaign_id,
            amount=float(donation.amount),
            donation_hash=donation.donation_hash,
        )
        donation.hedera_topic_id = result["topic_id"]
        donation.hedera_transaction_id = result["transaction_id"]
        donation.hedera_sequence_number = result["sequence_number"]
        donation.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera HCS submission failed for donation %s", donation.id)
        donation.hedera_status = "pending"

    db.commit()
    db.refresh(donation)

    return donation


@router.get("/donations/receipt/{receipt_token}", response_model=schemas.ReceiptVerification)
def get_donation_receipt(receipt_token: str, db: Session = Depends(get_db)):
    donation = db.query(models.Donation).filter(models.Donation.receipt_token == receipt_token).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Donation receipt not found")

    campaign = db.query(models.Campaign).filter(models.Campaign.id == donation.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    ngo = db.query(models.NGO).filter(models.NGO.id == campaign.ngo_id).first()
    events_count = db.query(func.count(models.AidEvent.id)).filter(models.AidEvent.campaign_id == campaign.id).scalar() or 0

    is_verified_onchain = False
    consensus_timestamp = None
    if donation.hedera_topic_id and donation.hedera_sequence_number and donation.donation_hash:
        mirror_check = verify_topic_message(
            topic_id=donation.hedera_topic_id,
            sequence_number=donation.hedera_sequence_number,
            expected_hash=donation.donation_hash,
        )
        is_verified_onchain = bool(mirror_check.get("is_valid", False))
        consensus_timestamp = mirror_check.get("consensus_timestamp")

    return {
        "receipt_token": donation.receipt_token,
        "donation_id": donation.id,
        "campaign_id": campaign.id,
        "campaign_title": campaign.title,
        "amount": donation.amount,
        "donor_name": donation.donor_name,
        "donation_status": donation.status,
        "confirmed_at": donation.created_at,
        "ngo_name": ngo.name if ngo else "Unknown NGO",
        "ngo_verification_status": ngo.verification_status if ngo else "pending",
        "events_count": events_count,
        "donation_hash": donation.donation_hash,
        "hedera_topic_id": donation.hedera_topic_id,
        "hedera_sequence_number": donation.hedera_sequence_number,
        "hedera_transaction_id": donation.hedera_transaction_id,
        "is_verified_onchain": is_verified_onchain,
        "consensus_timestamp": consensus_timestamp,
        "hashscan_tx_url": (
            f"https://hashscan.io/testnet/transaction/{donation.hedera_transaction_id}"
            if donation.hedera_transaction_id
            else None
        ),
        "hashscan_topic_url": (
            f"https://hashscan.io/testnet/topic/{donation.hedera_topic_id}"
            if donation.hedera_topic_id
            else None
        ),
    }


@router.get("/events/{event_id}/verify", response_model=schemas.AidEventVerification)
def verify_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.AidEvent).filter(models.AidEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Aid event not found")

    canonical_payload = {
        "id": event.id,
        "campaign_id": event.campaign_id,
        "event_type": event.event_type,
        "description": event.description,
        "proof_url": event.proof_url,
        "created_at": event.created_at.isoformat(),
    }

    calculated_hash = hash_event(canonical_payload)

    # STRICT verification: query the live Hedera Mirror Node
    mirror_check = verify_topic_message(
        topic_id=event.hedera_topic_id,
        sequence_number=event.hedera_sequence_number,
        expected_hash=calculated_hash,
    )

    # A record is strictly valid ONLY IF:
    # 1. DB hash matches calculated hash
    # 2. Database status is confirmed
    # 3. Message exists on Hedera testnet Mirror Node and hash matches!
    is_valid = bool(
        event.event_hash is not None
        and event.event_hash == calculated_hash
        and event.hedera_status == "confirmed"
        and mirror_check.get("is_valid", False)
    )

    hashscan_tx_url = (
        f"https://hashscan.io/testnet/transaction/{event.hedera_transaction_id}"
        if event.hedera_transaction_id
        else None
    )
    hashscan_topic_url = (
        f"https://hashscan.io/testnet/topic/{event.hedera_topic_id}"
        if event.hedera_topic_id
        else None
    )

    return {
        "event_id": event.id,
        "canonical_payload": canonical_payload,
        "calculated_hash": calculated_hash,
        "stored_hash": event.event_hash,
        "is_valid": is_valid,
        "verified_at_mirror_node": mirror_check.get("verified_at_mirror_node", False),
        "consensus_timestamp": mirror_check.get("consensus_timestamp"),
        "running_hash": mirror_check.get("running_hash"),
        "hedera_topic_id": event.hedera_topic_id,
        "hedera_sequence_number": event.hedera_sequence_number,
        "hedera_transaction_id": event.hedera_transaction_id,
        "hedera_status": event.hedera_status,
        "hashscan_tx_url": hashscan_tx_url,
        "hashscan_topic_url": hashscan_topic_url,
        "verification_message": (
            "Cryptographically verified on Hedera Testnet Consensus Topic"
            if is_valid
            else mirror_check.get("error") or "Verification failed"
        ),
    }


@router.post("/events/{event_id}/anchor", response_model=schemas.AidEventRead)
def anchor_event_to_hedera(
    event_id: int,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    event = db.query(models.AidEvent).filter(models.AidEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Aid event not found")

    campaign = get_campaign_or_404(db, event.campaign_id)
    ensure_campaign_access(campaign, moderator)

    canonical_payload = {
        "id": event.id,
        "campaign_id": event.campaign_id,
        "event_type": event.event_type,
        "description": event.description,
        "proof_url": event.proof_url,
        "created_at": event.created_at.isoformat(),
    }

    event.event_hash = hash_event(canonical_payload)

    try:
        result = submit_event_hash(event.event_hash)
        event.hedera_topic_id = result["topic_id"]
        event.hedera_transaction_id = result["transaction_id"]
        event.hedera_sequence_number = result["sequence_number"]
        event.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera re-submission failed for aid event %s", event.id)
        event.hedera_status = "failed"
        db.commit()
        db.refresh(event)
        raise HTTPException(status_code=502, detail="Failed to anchor message on Hedera HCS")

    db.commit()
    db.refresh(event)
    return event


def ensure_campaign_access(campaign: models.Campaign, moderator: models.Moderator):
    if moderator.role == "ngo_admin" and moderator.ngo_id != campaign.ngo_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="You can only manage your own NGO's campaigns",)
