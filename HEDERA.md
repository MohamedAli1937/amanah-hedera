# Hedera integration — technical note

*For the Hedera Cross Campus Challenge 2026. This is the part of the project that matters most to the judges (Meaningful Hedera Integration = 25% of the score).*

## The problem we solve

Humanitarian aid is usually tracked in a private database. A donor cannot independently prove that a reported delivery happened, because the organisation controls both the record and the story. Even a well-intentioned database is mutable.

## What Hedera enables here

Amanah stores **application state** in Neon Postgres, but stores **proof** on **Hedera Consensus Service (HCS)**. For every financially meaningful record we:

1. Build a canonical JSON payload (fixed keys, sorted, no whitespace).
2. Compute `SHA-256` of that payload.
3. Submit the hash to an HCS topic on Hedera testnet.
4. Store the returned `topic_id`, `sequence_number` and `transaction_id` next to the record.
5. Let anyone recompute the hash and compare it with the public mirror node message.

The database answer is "what we claim". The Hedera answer is "what was provably recorded at a consensus timestamp". Both are needed, and only the second is independently verifiable.

## Records that are anchored

| Record | When it is anchored | Canonical payload (key fields) |
| --- | --- | --- |
| Donation | Immediately when the NGO issues the receipt | `receipt_token`, `campaign_id`, `amount`, `donor_name`, `created_at` |
| Expense | Immediately on creation | `id`, `campaign_id`, `amount`, `description`, `proof_url`, `created_at` |
| Campaign update | Immediately on creation | `id`, `campaign_id`, `kind`, `message`, `media_url`, `created_at` |
| Aid milestone | **Only after moderator approval** | `id`, `campaign_id`, `event_type`, `description`, `proof_url`, `created_at` |

Rejected milestones are never anchored and never shown publicly — moderation happens *before* the immutable write.

**Anonymity:** there is no donor account and no login for donors. The donor name is **optional and defaults to `Anonymous`**. No personal data is required, and only the SHA-256 hash — never a personal identity — is written on chain. The hash is a proof of *that receipt's content*, not a profile.

## Hashing and submission (backend)

```python
canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
event_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

message = json.dumps({"event_hash": event_hash, "algorithm": "SHA-256"})
TopicMessageSubmitTransaction(topic_id=topic_id, message=message)...execute(client)
```

The SDK returns a consensus `sequence_number` and a `transaction_id`, which are persisted in Postgres and exposed through the API.

## Verification (public)

`GET /donations/receipt/{token}` and `GET /events/{id}/verify`:

```
recomputed_hash = SHA-256(canonical payload of the record)
GET https://testnet.mirrornode.hedera.com/api/v1/topics/{topic}/messages/{sequence}
compare message.event_hash / donation_hash with recomputed_hash
→ is_verified_onchain, consensus_timestamp, HashScan URL
```

If the mirror node is unreachable, the UI honestly reports `is_verified_onchain = false` rather than assuming success.

## Public references used in the demo

- Network: **Hedera testnet**
- Topic: **`0.0.10972610`** (`GET /network` returns this dynamically — no hardcoded IDs in the frontend)
- Operator account: **`0.0.10942435`**
- Topic explorer: `https://hashscan.io/testnet/topic/0.0.10972610`
- Example anchored message from the demo: transaction `0.0.10942435@1794852799.167720079`, sequence **43** (the Cucuta purchase milestone), plus its stored SHA-256 `event_hash`.

Open the transaction link on HashScan during the pitch to show a real consensus message.

## Why Hedera specifically

- **Consensus ordering + timestamp** — we can prove *when* a record existed, not just that a row exists.
- **Immutability** — a moderator/NGO cannot quietly rewrite history after the fact.
- **Public mirror node** — verification needs no API key and no trust in our backend.
- **Low cost and fast finality** — practical for many small aid records on testnet.
- **No chain to operate** — we use a managed service, which is why a small team can demo it in a hackathon.

## If we removed Hedera

Amanah would become a normal CRUD app: the NGO's database would be the only source of truth, receipts would be self-issued claims, and "verification" would mean trusting our own server. Hedera is what turns the project from a dashboard into an audit tool.

## Honest limitations (good to say out loud)

- We anchor hashes, not the proof documents themselves; proof URLs are off-chain (IPFS CIDs are a future improvement).
- Verification depends on the public Hedera mirror node being reachable.
- The demo uses testnet and demo credentials; production needs its own account, topic and secret management.
