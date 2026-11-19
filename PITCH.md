# Pitch kit — ~5 minutes (English)

Links: app **https://amanah-roan.vercel.app/** · API **https://amanah-api-eflu.onrender.com/** · repo: GitHub `MohamedAli1937/amanah-hedera`

## Timing & slides (7 slides, 5 min)

| Time | Slide | Say |
| --- | --- | --- |
| 0:00–0:35 | 1 — Project & team | "Amanah — transparent humanitarian aid, anchored on Hedera. I'm [name], [team]." One-line description: a PoC where every aid record is hash-anchored on HCS and publicly verifiable. |
| 0:35–1:15 | 2 — Problem | Donors must trust the NGO's own database; records can be edited; no independent proof of delivery. For humanitarian aid, that trust gap reduces donations and accountability. |
| 1:15–1:50 | 3 — Solution | Two roles: platform moderator and NGO admin. NGOs publish campaigns, record donations, expenses and milestones with proof; moderators approve milestones; anyone can verify a receipt and follow the donation-to-delivery chain. No donor account: name is optional (defaults to Anonymous), and only a hash goes on-chain. |
| 1:50–2:35 | 4 — Product / PoC | **Start the demo video here** (or live demo). Show: NGO registration → moderator approval → campaign in Tunis → $500 donation + receipt QR → receipt verification → milestone/update/expense → moderator approval → campaign detail + global ledger. |
| 2:35–3:25 | 5 — Technology & Hedera | Architecture: React/Vite on Vercel → FastAPI on Render → Neon Postgres + Hedera HCS testnet. Show `HEDERA.md` diagram: canonical payload → SHA-256 → HCS topic → mirror node verification → HashScan link. Say the exact topic ID and open a HashScan transaction. Phrase it carefully: **no account, name optional (defaults to Anonymous), only a hash on-chain** — the hash proves the receipt, not a person. **This slide carries 25% of the score.** |
| 3:25–4:15 | 6 — Impact & adoption | Aid agencies, NGOs, donors, auditors. Value: verifiable impact reports, faster donor trust, lower fraud, audit-ready records. Free HCS testnet makes it feasible for small organisations. |
| 4:15–5:00 | 7 — Conclusion / vision | "Transparency is not a promise here — it is verifiable, timestamped and anchored on Hedera." Next: IPFS proof files, donor opt-in identity, mainnet, multi-topic. |

## Demo beats (must be visible)

- Pending NGO → moderator **Accept**
- Campaign created with **Tunisia → Tunis** on the map
- Donation `$500` → receipt modal with **code + QR**, PNG/SVG download
- Receipt verified → **Authentic Hedera HCS Record**, HCS sequence, HashScan link
- QR pairing: desktop QR → phone scan of printed receipt QR (use the phone screenshot in the video)
- Milestone created **pending** → moderator **Approve & anchor** → appears in Aid progress
- Update + expense anchored automatically
- Campaign detail → campaign ledger → global ledger

## Judging criteria → where we score

| Criterion | Weight | Our answer |
| --- | --- | --- |
| Problem relevance | 15% | Donors can't independently verify aid delivery; we make it auditable. |
| **Meaningful Hedera integration** | **25%** | Hashes on HCS, consensus timestamps, mirror-node verification, public HashScan links — not a token gimmick. |
| Technical execution | 20% | Working full-stack PoC with auth, roles, moderation, two deployments and a live database. |
| Innovation | 15% | Moderation *before* anchoring + phone QR pairing of paper receipts. |
| Impact/adoption | 15% | NGOs, donors, auditors; cheap public verification via HCS. |
| Pitch & demo | 10% | 5-min pitch + <5-min narrated video + live links. |

## Likely judge questions (answers)

- **"Why Hedera instead of a database?"** A database row can be edited silently. HCS gives immutable, timestamped, publicly verifiable messages; the DB stores state, Hedera stores proof.
- **"Why not store the proof files on-chain?"** Too large and unnecessary — we anchor their SHA-256 hash; proof URLs are off-chain (IPFS is the next step).
- **"What happens to rejected milestones?"** They are never hashed or anchored and are never shown publicly. Moderation happens before the immutable write.
- **"Is anything centralized?"** Yes: identity/roles and the database. Hedera covers the audit trail only, which is the part that needs public trust.
- **"Is this production ready?"** No — it is a PoC. We deliberately kept scope tight and focused on the verifiable core.

## Final checklist

- [ ] 4Hacks: registered, joined correct Campus Edition, team created
- [ ] Submission form filled early; all mandatory fields complete
- [ ] Repo public and README/HEDERA.md readable
- [ ] App + API links open without login
- [ ] Demo video < 5:00 with voice, logo, QR-phone screenshot
- [ ] Demo accounts work: `moderator@amanah.com` / `Amanah123456!`, `contact@globalhope.org` / `Amanah123456!`
- [ ] CARTO key set in Vercel so the map has no watermark
- [ ] Latest changes pushed and deployed (both Vercel and Render)
