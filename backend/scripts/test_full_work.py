import os
import sys
import time
import json
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv

load_dotenv("d:/userdata/Desktop/amanah/backend/.env")

API_BASE = "http://localhost:8000"

def run_e2e_test():
    print("===================================================================")
    print("        AMANAH HUMANITARIAN PLATFORM — END-TO-END AUDIT TEST       ")
    print("===================================================================")

    # 1. Check initial campaign stats
    print("\n[Step 1] Fetching active campaigns from Neon DB...")
    req = urllib.request.urlopen(f"{API_BASE}/campaigns/")
    campaigns = json.loads(req.read().decode())
    gaza_campaign = next((c for c in campaigns if c["id"] == 5 or "Gaza" in c["title"]), campaigns[0])
    initial_collected = float(gaza_campaign["collected_amount"] or 0)
    initial_donors = int(gaza_campaign["number_of_donors"] or 0)
    target_camp_id = gaza_campaign["id"]
    print(f"  Target Campaign: #{target_camp_id} '{gaza_campaign['title']}'")
    print(f"  Current Balance: ${initial_collected:,.2f} USD ({initial_donors} donors)")

    # 2. NGO Admin records a direct donation
    donation_amount = 75.00
    print(f"\n[Step 2] NGO Admin records an in-person contribution of ${donation_amount:.2f} USD...")
    payload = json.dumps({
        "campaign_id": target_camp_id,
        "amount": donation_amount
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{API_BASE}/campaigns/{target_camp_id}/donations",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        donation = json.loads(resp.read().decode())

    receipt_token = donation.get("receipt_token")
    seq_number = donation.get("hedera_sequence_number")
    tx_id = donation.get("hedera_transaction_id")
    topic_id = donation.get("hedera_topic_id")

    print(f"  -> Donation Record Created in Neon DB (ID #{donation.get('id')})")
    print(f"  -> Generated Receipt Token: {receipt_token}")
    print(f"  -> Hedera Topic: {topic_id}")
    print(f"  -> Real Hedera Sequence #: {seq_number}")
    print(f"  -> Real Transaction ID: {tx_id}")

    assert receipt_token is not None, "Receipt token must be generated!"
    assert seq_number is not None, "Hedera sequence number must be present!"
    assert tx_id is not None, "Hedera transaction ID must be present!"

    # 3. Verify on Hedera Mirror Node
    print("\n[Step 3] Querying live Hedera Mirror Node to verify on-chain consensus...")
    print("  Waiting 5 seconds for Mirror Node ingestion...")
    time.sleep(5)

    mirror_url = f"https://testnet.mirrornode.hedera.com/api/v1/topics/{topic_id}/messages/{seq_number}"
    req = urllib.request.Request(mirror_url, headers={"User-Agent": "Amanah-Test/1.0"})
    with urllib.request.urlopen(req) as resp:
        mirror_data = json.loads(resp.read().decode())

    import base64
    msg_raw = base64.b64decode(mirror_data["message"]).decode("utf-8", errors="ignore")
    print(f"  -> Mirror Node Consensus Timestamp: {mirror_data.get('consensus_timestamp')}")
    print(f"  -> Running Hash: {mirror_data.get('running_hash')[:32]}...")
    print(f"  -> Raw Consensus Payload: {msg_raw}")

    # 4. Donor verifies the receipt via Quick Verify endpoint
    print(f"\n[Step 4] Donor verifies receipt '{receipt_token}' via /donations/receipt/...")
    req = urllib.request.urlopen(f"{API_BASE}/donations/receipt/{receipt_token}")
    verification = json.loads(req.read().decode())
    print(f"  -> Is Verified On-Chain: {verification.get('is_verified_onchain')}")
    print(f"  -> Campaign: {verification.get('campaign_title')}")
    print(f"  -> Managing NGO: {verification.get('ngo_name')}")
    print(f"  -> HashScan URL: {verification.get('hashscan_tx_url')}")

    assert verification.get("is_verified_onchain") is True, "Must be verified on-chain!"

    # 5. Check updated campaign stats
    print("\n[Step 5] Checking updated campaign financials...")
    req = urllib.request.urlopen(f"{API_BASE}/campaigns/")
    campaigns_after = json.loads(req.read().decode())
    gaza_after = next((c for c in campaigns_after if c["id"] == target_camp_id), campaigns_after[0])
    new_collected = float(gaza_after["collected_amount"] or 0)
    new_donors = int(gaza_after["number_of_donors"] or 0)
    print(f"  -> Updated Balance: ${new_collected:,.2f} USD (+${new_collected - initial_collected:,.2f})")
    print(f"  -> Updated Donors Count: {new_donors} (+{new_donors - initial_donors})")

    assert new_collected >= initial_collected + donation_amount, "Balance must increase!"

    print("\n===================================================================")
    print("               ALL TESTS PASSED! FULL SYSTEM VERIFIED             ")
    print("===================================================================")
    print(f"Sample Receipt to test in UI: {receipt_token}")
    print(f"HashScan Explorer Link: https://hashscan.io/testnet/transaction/{tx_id}")

if __name__ == "__main__":
    run_e2e_test()
