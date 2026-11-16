import React, { useState } from "react";
import type { Expense } from "../types";
import { api } from "../api";

interface Props {
  campaignId: number;
  onClose: () => void;
  onCreated: (expense: Expense) => void;
}

export const CreateExpenseModal: React.FC<Props> = ({ campaignId, onClose, onCreated }) => {
  const [amount, setAmount] = useState<number | string>("");
  const [description, setDescription] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<Expense>(`/campaigns/${campaignId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          campaign_id: campaignId,
          amount: Number(amount),
          description: description.trim(),
          proof_url: proofUrl.trim() || null,
        }),
      });
      onCreated(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record expense");
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
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18M7 15h4" />
              </svg>
            </div>
            <div>
              <span className="eyebrow">Financial accountability</span>
              <h2 className="campaign-modal-title">Record Operational Expense</h2>
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
            <label>Expense Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 1250.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label>Expense Item Description</label>
            <textarea
              required
              rows={3}
              minLength={3}
              placeholder="e.g. Purchase of 100 blankets and thermal insulation kits..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label>Receipt / Invoice Proof URL (PDF or Image link)</label>
            <input
              type="url"
              placeholder="https://example.com/receipts/invoice-401.pdf"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>

          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Expenses are hashed (SHA-256) and anchored on Hedera HCS automatically.
          </p>

          <div className="campaign-modal-footer">
            <button type="button" className="btn sec" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn am" disabled={loading}>
              {loading ? "Recording…" : "Save Expense Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExpenseModal;
