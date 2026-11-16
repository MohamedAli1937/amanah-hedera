import React, { useState } from "react";
import type { CampaignUpdate } from "../types";
import { api } from "../api";

interface Props {
  campaignId: number;
  onClose: () => void;
  onCreated: (update: CampaignUpdate) => void;
}

const KINDS: { value: CampaignUpdate["kind"]; label: string }[] = [
  { value: "update", label: "General update" },
  { value: "photo", label: "Photo / story" },
  { value: "thanks", label: "Thank donors" },
  { value: "purchase", label: "Purchase evidence" },
  { value: "shipment", label: "Shipment evidence" },
  { value: "distribution", label: "Distribution evidence" },
];

export const CreateUpdateModal: React.FC<Props> = ({ campaignId, onClose, onCreated }) => {
  const [kind, setKind] = useState<CampaignUpdate["kind"]>("update");
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<CampaignUpdate>(`/campaigns/${campaignId}/updates`, {
        method: "POST",
        body: JSON.stringify({ kind, message: message.trim(), media_url: mediaUrl.trim() || null }),
      });
      onCreated(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post update");
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
                <path d="M4 5h16v11H8l-4 4V5z" />
              </svg>
            </div>
            <div>
              <span className="eyebrow">Field updates</span>
              <h2 className="campaign-modal-title">Post a Campaign Update</h2>
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
            <label>Update Type</label>
            <div className="campaign-two-col">
              {KINDS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`btn ${kind === option.value ? "am" : "sec"}`}
                  style={{ minHeight: 42, padding: "0 12px", justifyContent: "flex-start", fontSize: 13, borderRadius: 14 }}
                  onClick={() => setKind(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label>Message</label>
            <textarea
              required
              rows={3}
              minLength={3}
              maxLength={4000}
              placeholder="Tell donors what happened and what is next…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div>
            <label>Photo / proof URL (optional)</label>
            <input
              type="url"
              placeholder="https://example.org/photos/delivery.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          </div>

          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Every update is hashed (SHA-256) and anchored on Hedera HCS so the public ledger stays complete.
          </p>

          <div className="campaign-modal-footer">
            <button type="button" className="btn sec" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn am" disabled={loading}>
              {loading ? "Posting…" : "Post update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUpdateModal;
