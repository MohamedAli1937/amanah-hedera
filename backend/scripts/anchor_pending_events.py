import logging
from app.database import SessionLocal
from app.models import AidEvent
from app.services.hedera_service import hash_event, submit_event_hash

logging.basicConfig(level=logging.INFO)

def anchor_pending():
    db = SessionLocal()
    try:
        events = db.query(AidEvent).filter(AidEvent.hedera_status != "confirmed").all()
        print(f"Found {len(events)} events to anchor to Hedera HCS.")
        for event in events:
            canonical_payload = {
                "id": event.id,
                "campaign_id": event.campaign_id,
                "event_type": event.event_type,
                "description": event.description,
                "proof_url": event.proof_url,
                "created_at": event.created_at.isoformat(),
            }
            event.event_hash = hash_event(canonical_payload)
            print(f"Submitting event {event.id} ({event.event_type}) with hash {event.event_hash[:12]}...")
            try:
                res = submit_event_hash(event.event_hash)
                event.hedera_topic_id = res["topic_id"]
                event.hedera_transaction_id = res["transaction_id"]
                event.hedera_sequence_number = res["sequence_number"]
                event.hedera_status = "confirmed"
                db.commit()
                print(f"  [OK] Confirmed on Hedera! Seq #{res['sequence_number']}, Tx: {res['transaction_id']}")
            except Exception as e:
                print(f"  [FAIL] Failed to submit event {event.id}: {e}")

                db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    anchor_pending()
