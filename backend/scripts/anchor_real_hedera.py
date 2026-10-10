import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv("d:/userdata/Desktop/amanah/backend/.env")

from app.models import AidEvent, Donation, Campaign
from app.services.hedera_service import (
    hash_event,
    hash_donation,
    submit_event_hash,
    submit_donation_hash,
    verify_topic_message,
)

engine = create_engine(os.environ["DATABASE_URL"])
Session = sessionmaker(bind=engine)
db = Session()

try:
    print("=== STEP 1: SUBMIT REAL CONSENSUS MESSAGES FOR AID EVENTS 8, 9, 10 ===")
    events = db.query(AidEvent).filter(AidEvent.id.in_([8, 9, 10])).order_by(AidEvent.id).all()
    for ev in events:
        canonical_payload = {
            "id": ev.id,
            "campaign_id": ev.campaign_id,
            "event_type": ev.event_type,
            "description": ev.description,
            "proof_url": ev.proof_url,
            "created_at": ev.created_at.isoformat(),
        }
        ev.event_hash = hash_event(canonical_payload)
        print(f"\nSubmitting Aid Event #{ev.id} (Campaign {ev.campaign_id}, {ev.event_type})...")
        res = submit_event_hash(ev.event_hash)
        ev.hedera_topic_id = res["topic_id"]
        ev.hedera_transaction_id = res["transaction_id"]
        ev.hedera_sequence_number = res["sequence_number"]
        ev.hedera_status = "confirmed"
        db.commit()
        print(f"  -> SUCCESS! Real Hedera Seq #{ev.hedera_sequence_number}, Tx: {ev.hedera_transaction_id}")
        time.sleep(1.5)

    print("\n=== STEP 2: ANCHOR CONFIRMED DONATIONS TO HEDERA HCS ===")
    donations = db.query(Donation).filter(Donation.status == "confirmed").order_by(Donation.id).all()
    print(f"Found {len(donations)} confirmed donations to anchor.")
    for don in donations:
        if don.hedera_status == "confirmed" and don.hedera_sequence_number:
            print(f"  Donation #{don.id} already anchored (Seq #{don.hedera_sequence_number})")
            continue

        don_payload = {
            "receipt_token": don.receipt_token,
            "campaign_id": don.campaign_id,
            "amount": str(don.amount),
            "created_at": don.created_at.isoformat() if don.created_at else None,
        }
        don.donation_hash = hash_donation(don_payload)
        print(f"Submitting Donation #{don.id} (Campaign {don.campaign_id}, Amount ${don.amount})...")
        try:
            res = submit_donation_hash(
                receipt_token=don.receipt_token,
                campaign_id=don.campaign_id,
                amount=float(don.amount),
                donation_hash=don.donation_hash,
            )
            don.hedera_topic_id = res["topic_id"]
            don.hedera_transaction_id = res["transaction_id"]
            don.hedera_sequence_number = res["sequence_number"]
            don.hedera_status = "confirmed"
            db.commit()
            print(f"  -> SUCCESS! Real Hedera Seq #{don.hedera_sequence_number}, Tx: {don.hedera_transaction_id}")
            time.sleep(1.5)
        except Exception as e:
            print(f"  -> Failed to anchor donation {don.id}: {e}")
            db.rollback()

    print("\n=== STEP 3: WAIT FOR MIRROR NODE PROPAGATION AND AUDIT ALL AID EVENTS ===")
    print("Waiting 6 seconds for Mirror Node ingestion...")
    time.sleep(6)

    all_events = db.query(AidEvent).order_by(AidEvent.id).all()
    print(f"\nAuditing all {len(all_events)} aid events against Hedera Mirror Node:")
    all_passed = True
    for ev in all_events:
        canonical_payload = {
            "id": ev.id,
            "campaign_id": ev.campaign_id,
            "event_type": ev.event_type,
            "description": ev.description,
            "proof_url": ev.proof_url,
            "created_at": ev.created_at.isoformat(),
        }
        calc_hash = hash_event(canonical_payload)
        check = verify_topic_message(ev.hedera_topic_id, ev.hedera_sequence_number, calc_hash)
        if check.get("is_valid"):
            print(f"  [PASS] Event #{ev.id} (Campaign {ev.campaign_id}): Seq #{ev.hedera_sequence_number}, Tx: {ev.hedera_transaction_id}")
        else:
            all_passed = False
            print(f"  [FAIL] Event #{ev.id}: {check.get('error')}")

    print(f"\nAudit completed. All events verified on-chain: {all_passed}")

finally:
    db.close()
