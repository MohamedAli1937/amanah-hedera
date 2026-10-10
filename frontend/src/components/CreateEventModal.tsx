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

  const eventTypes: { value: AidEvent["event_type"]; label: string; icon: string }[] = [
    { value: "purchase", label: "Purchase & Procurement", icon: "📦" },
    { value: "shipment", label: "Dispatch & Shipment", icon: "🚚" },
    { value: "arrival", label: "Regional Depot Arrival", icon: "📍" },
    { value: "distribution", label: "Direct Field Distribution", icon: "🤝" },
    { value: "completed", label: "Campaign Activity Completed", icon: "🏁" },
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="badge hedera-badge">
              <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Hedera HCS Anchoring
            </span>
            <h2>Record Aid Milestone</h2>
          </div>
          <button className="icon-button close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert error">{error}</div>}

          <div className="form-info-banner">
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p>
              This update will be cryptographically hashed (SHA-256) and immutably timestamped onto Hedera Consensus Service topic <code>0.0.10972610</code>.
            </p>
          </div>

          <label>
            Milestone Type
            <div className="event-type-grid">
              {eventTypes.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  className={`event-type-btn ${eventType === type.value ? "selected" : ""}`}
                  onClick={() => setEventType(type.value)}
                >
                  <span className="event-type-icon">{type.icon}</span>
                  <span className="event-type-label">{type.label}</span>
                </button>
              ))}
            </div>
          </label>

          <label>
            Description of Aid Action
            <textarea
              required
              rows={3}
              minLength={3}
              placeholder="e.g. 500 emergency rations dispatched from Tunis central depot via convoy #4..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Supporting Proof URL (Invoice, Waybill, Photo, or Certificate)
            <input
              type="url"
              placeholder="https://example.com/proofs/waybill-04.pdf"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </label>

          <div className="modal-actions-row">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Anchoring on Hedera HCS..." : "Post & Anchor Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
