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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">FINANCIAL ACCOUNTABILITY</span>
            <h2>Record Operational Expense</h2>
          </div>
          <button className="icon-button close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert error">{error}</div>}

          <label>
            Expense Amount (TND)
            <input
              type="number"
              step="0.001"
              min="0.001"
              required
              placeholder="e.g. 1250.000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label>
            Expense Item Description
            <textarea
              required
              rows={3}
              minLength={3}
              placeholder="e.g. Purchase of 100 blankets and thermal insulation kits..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Receipt / Invoice Proof URL (PDF or Image link)
            <input
              type="url"
              placeholder="https://example.com/receipts/invoice-401.pdf"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </label>

          <div className="modal-actions-row">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Recording..." : "Save Expense Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
