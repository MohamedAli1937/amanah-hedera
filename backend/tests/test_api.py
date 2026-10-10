from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "Amanah API is running"


def test_get_campaigns():
    response = client.get("/campaigns/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "collected_amount" in data[0]
    assert "recorded_expenses" in data[0]


def test_get_campaign_stats():
    response = client.get("/campaigns/stats")
    assert response.status_code == 200
    stats = response.json()
    assert "total_campaigns" in stats
    assert "hedera_confirmed_events" in stats
    assert stats["hedera_confirmed_events"] >= 6


def test_get_campaign_detail():
    response = client.get("/campaigns/1")
    assert response.status_code == 200
    campaign = response.json()
    assert campaign["id"] == 1
    assert "title" in campaign
    assert "goal" in campaign


def test_get_campaign_events():
    response = client.get("/campaigns/1/events")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)
    assert len(events) > 0
    assert "hedera_status" in events[0]


def test_verify_aid_event():
    response = client.get("/events/1/verify")
    assert response.status_code == 200
    verification = response.json()
    assert verification["event_id"] == 1
    assert verification["is_valid"] is True
    assert verification["stored_hash"] == verification["calculated_hash"]
    assert verification["hedera_status"] == "confirmed"
    assert verification["hashscan_tx_url"] is not None


def test_donation_receipt_lookup():
    response = client.get("/donations/receipt/TEST-RECEIPT-MED-001")
    assert response.status_code == 200
    receipt = response.json()
    assert receipt["receipt_token"] == "TEST-RECEIPT-MED-001"
    assert float(receipt["amount"]) == 500.0


def test_record_donation():
    response = client.post("/campaigns/1/donations", json={"campaign_id": 1, "amount": 25.0})
    assert response.status_code == 201
    donation = response.json()
    assert donation["campaign_id"] == 1
    assert donation["status"] == "pending"
    assert float(donation["amount"]) == 25.0
