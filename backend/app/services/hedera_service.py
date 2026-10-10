import base64
import hashlib
import json
import logging
import os
import urllib.error
import urllib.request

from dotenv import load_dotenv
from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
    TopicId,
    TopicMessageSubmitTransaction,
)

load_dotenv()
logger = logging.getLogger(__name__)


def hash_event(event: dict) -> str:
    canonical = json.dumps(
        event,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def hash_donation(donation: dict) -> str:
    canonical = json.dumps(
        donation,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def submit_event_hash(event_hash: str) -> dict:
    account_id = AccountId.from_string(os.environ["HEDERA_ACCOUNT_ID"])
    private_key_hex = os.environ["HEDERA_PRIVATE_KEY"].removeprefix("0x")
    private_key = PrivateKey.from_bytes_ecdsa(
        bytes.fromhex(private_key_hex)
    )
    topic_id = TopicId.from_string(os.environ["HEDERA_TOPIC_ID"])

    client = Client(Network("testnet"))
    client.set_operator(account_id, private_key)

    try:
        message = json.dumps({
            "event_hash": event_hash,
            "algorithm": "SHA-256",
        })

        transaction = (
            TopicMessageSubmitTransaction(
                topic_id=topic_id,
                message=message,
            )
            .freeze_with(client)
            .sign(private_key)
        )

        receipt = transaction.execute(client)

        return {
            "topic_id": str(topic_id),
            "sequence_number": receipt.topic_sequence_number,
            "transaction_id": str(receipt.transaction_id),
            "event_hash": event_hash,
        }
    finally:
        client.close()


def submit_donation_hash(receipt_token: str, campaign_id: int, amount: float, donation_hash: str) -> dict:
    account_id = AccountId.from_string(os.environ["HEDERA_ACCOUNT_ID"])
    private_key_hex = os.environ["HEDERA_PRIVATE_KEY"].removeprefix("0x")
    private_key = PrivateKey.from_bytes_ecdsa(
        bytes.fromhex(private_key_hex)
    )
    topic_id = TopicId.from_string(os.environ["HEDERA_TOPIC_ID"])

    client = Client(Network("testnet"))
    client.set_operator(account_id, private_key)

    try:
        message = json.dumps({
            "type": "donation_receipt",
            "receipt_token": receipt_token,
            "campaign_id": campaign_id,
            "amount": float(amount),
            "donation_hash": donation_hash,
            "algorithm": "SHA-256",
        })

        transaction = (
            TopicMessageSubmitTransaction(
                topic_id=topic_id,
                message=message,
            )
            .freeze_with(client)
            .sign(private_key)
        )

        receipt = transaction.execute(client)

        return {
            "topic_id": str(topic_id),
            "sequence_number": receipt.topic_sequence_number,
            "transaction_id": str(receipt.transaction_id),
            "donation_hash": donation_hash,
        }
    finally:
        client.close()


def verify_topic_message(topic_id: str, sequence_number: int, expected_hash: str) -> dict:
    """
    Independently queries the public Hedera Testnet Mirror Node to verify that:
    1. A message exists at the given topic_id and sequence_number.
    2. The consensus payload matches the expected SHA-256 hash.
    """
    if not topic_id or not sequence_number or not expected_hash:
        return {
            "is_valid": False,
            "error": "Missing topic_id, sequence_number, or expected_hash",
            "topic_id": topic_id,
            "sequence_number": sequence_number,
            "verified_at_mirror_node": False,
        }

    url = f"https://testnet.mirrornode.hedera.com/api/v1/topics/{topic_id}/messages/{sequence_number}"
    req = urllib.request.Request(url, headers={"User-Agent": "Amanah-Auditor/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))

            raw_b64 = data.get("message", "")
            decoded_str = base64.b64decode(raw_b64).decode("utf-8", errors="ignore")

            matched = False
            parsed_payload = None
            try:
                parsed_payload = json.loads(decoded_str)
                if isinstance(parsed_payload, dict):
                    msg_hash = (
                        parsed_payload.get("event_hash")
                        or parsed_payload.get("donation_hash")
                        or parsed_payload.get("hash")
                    )
                    if msg_hash and msg_hash.lower() == expected_hash.lower():
                        matched = True
            except Exception:
                pass

            if not matched and expected_hash.lower() in decoded_str.lower():
                matched = True

            return {
                "is_valid": matched,
                "consensus_timestamp": data.get("consensus_timestamp"),
                "sequence_number": data.get("sequence_number"),
                "topic_id": data.get("topic_id"),
                "payer_account_id": data.get("payer_account_id"),
                "running_hash": data.get("running_hash"),
                "message_payload": parsed_payload or decoded_str,
                "verified_at_mirror_node": True,
                "error": None if matched else "Hash mismatch: on-chain message hash does not match calculated canonical hash",
            }
    except urllib.error.HTTPError as e:
        return {
            "is_valid": False,
            "error": f"Hedera Mirror Node returned HTTP {e.code}: sequence #{sequence_number} does not exist on topic {topic_id}",
            "verified_at_mirror_node": False,
        }
    except Exception as e:
        logger.warning("Error fetching from Hedera mirror node: %s", e)
        return {
            "is_valid": False,
            "error": f"Failed to contact Hedera Mirror Node: {str(e)}",
            "verified_at_mirror_node": False,
        }