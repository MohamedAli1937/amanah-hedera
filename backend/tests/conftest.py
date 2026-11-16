"""Self-contained test environment: isolated SQLite DB + deterministic Hedera checks."""

import os
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import pytest

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Must be set BEFORE importing the app (database.py reads DATABASE_URL at import time).
os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp(prefix='amanah-tests-')) / 'test.db'}"
os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-key-longer-than-32-characters")

from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402
from app.auth import hash_password  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.services.hedera_service import hash_event  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def seed_database():
    """Create fresh tables and a small deterministic dataset shared by all tests."""
    with TestClient(app) as client:  # runs lifespan → create_all + compatibility migrations
        db = SessionLocal()
        try:
            ngo = models.NGO(
                id=1,
                name="Test Relief NGO",
                email="test-ngo@example.org",
                phone_number="+1000000000",
                registration_document="https://example.org/doc.pdf",
                verification_status="verified",
            )
            moderator = models.Moderator(
                email="moderator@amanah.com",
                password_hash=hash_password("Amanah123456!"),
                role="platform_admin",
                ngo_id=None,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            campaign = models.Campaign(
                id=1,
                title="Emergency Relief Campaign",
                description="A deterministic test campaign for the automated test suite.",
                goal=100000,
                status="active",
                ngo_id=1,
                location_name="Test City",
                region="Test Region",
                urgency="high",
                lat=1.0,
                lng=2.0,
                image_url="https://example.org/image.jpg",
                created_at=datetime.utcnow(),
            )
            donation = models.Donation(
                campaign_id=1,
                amount=500,
                status="confirmed",
                receipt_token="TEST-RECEIPT-MED-001",
                created_at=datetime.utcnow(),
                hedera_status="confirmed",
            )
            db.add_all([ngo, moderator, campaign, donation])
            db.flush()

            events = []
            for index in range(1, 7):
                created_at = datetime.utcnow() - timedelta(days=7 - index)
                event = models.AidEvent(
                    campaign_id=1,
                    event_type="distribution",
                    description=f"Seeded aid event number {index}",
                    proof_url="https://example.org/proof.pdf",
                    created_at=created_at,
                    hedera_topic_id="0.0.test",
                    hedera_transaction_id=f"0.0.1@{index}",
                    hedera_sequence_number=index,
                    hedera_status="confirmed",
                    review_status="approved",
                    reviewed_at=created_at,
                )
                # canonical payload must match verify_event() exactly
                event.event_hash = hash_event(
                    {
                        "id": 0,  # replaced after flush assigns the real id
                        "campaign_id": event.campaign_id,
                        "event_type": event.event_type,
                        "description": event.description,
                        "proof_url": event.proof_url,
                        "created_at": created_at.isoformat(),
                    }
                )
                events.append(event)

            db.add_all(events)
            db.commit()

            # Recompute hashes now that event ids are known.
            for event in events:
                event.event_hash = hash_event(
                    {
                        "id": event.id,
                        "campaign_id": event.campaign_id,
                        "event_type": event.event_type,
                        "description": event.description,
                        "proof_url": event.proof_url,
                        "created_at": event.created_at.isoformat() if event.created_at else None,
                    }
                )
            db.commit()
        finally:
            db.close()
        yield client


@pytest.fixture(autouse=True)
def fake_mirror_node(monkeypatch):
    """Hedera mirror verification is deterministic in tests (no network)."""
    monkeypatch.setattr(
        "app.routes.events.verify_topic_message",
        lambda **kwargs: {
            "is_valid": True,
            "verified_at_mirror_node": True,
            "consensus_timestamp": "2026-01-01T00:00:00.000Z",
            "running_hash": "test-running-hash",
        },
    )
