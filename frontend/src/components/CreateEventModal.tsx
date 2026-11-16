import React, { useState } from "react";
import type { AidEvent } from "../types";
import { api } from "../api";

interface Props {
  campaignId: number;
  onClose: () => void;
  onCreated: (event: AidEvent) => void;
}

export const CreateEventModal: React.FC<Props> = ({ campaignId, onClose, onCreated }) => {
  const [eventType, setEventType] = useState<AidEvent["event_type"]>("purchase");
  const [description, setDescription] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventTypes: { value: AidEvent["event_type"]; label: string }[] = [
    { value: "purchase", label: "Purchase & Procurement" },
    { value: "shipment", label: "Dispatch & Shipment" },
    { value: "arrival", label: "Regional Depot Arrival" },
    { value: "distribution", label: "Direct Field Distribution" },
    { value: "completed", label: "Campaign Activity Completed" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<AidEvent>(`/campaigns/${campaignId}/events`, {
        method: "POST",
        body: JSON.stringify({
          campaign_id: campaignId,
          event_type: eventType,
          description: description.trim(),
          proof_url: proofUrl.trim() || null,
        }),
      });
      onCreated(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record aid milestone");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop-frosted" onClick={onClose}>
      <div className="modal-card-frosted campaign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="campaign-modal-header">
          <div className="campaign-title-group">
            <div className="campaign-badge-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h18M3 12h18M3 17h10" />
              </svg>
            </div>
            <div>
              <span className="eyebrow">Submit for moderator review</span>
              <h2 className="campaign-modal-title">Record Aid Milestone</h2>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <div className="auth-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div>
            <label>Milestone Type</label>
            <div className="campaign-two-col">
              {eventTypes.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  className={`btn ${eventType === type.value ? "am" : "sec"}`}
                  style={{ minHeight: 42, padding: "0 12px", justifyContent: "flex-start", gap: 8, fontSize: 13, borderRadius: 14 }}
                  onClick={() => setEventType(type.value)}
                >
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label>Description of Aid Action</label>
            <textarea
              required
              rows={3}
              minLength={3}
              placeholder="e.g. 500 emergency rations dispatched from central depot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label>Supporting Proof URL (Invoice, Waybill, Photo, or Certificate)</label>
            <input
              type="url"
              placeholder="https://example.com/proofs/waybill-04.pdf"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>

          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Approved milestones are hashed (SHA-256) and anchored on Hedera HCS. Pending and rejected milestones stay off-chain.
          </p>

          <div className="campaign-modal-footer">
            <button type="button" className="btn sec" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn am" disabled={loading}>
              {loading ? "Submitting…" : "Submit Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;
