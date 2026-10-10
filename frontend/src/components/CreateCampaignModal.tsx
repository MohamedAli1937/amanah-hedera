import React, { useState } from "react";
import type { Campaign } from "../types";

import { api } from "../api";

interface Props {
  ngoId: number;
  onClose: () => void;
  onCreated: (campaign: Campaign) => void;
}

export const CreateCampaignModal: React.FC<Props> = ({ ngoId, onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState<number | string>("");
  const [donationLink, setDonationLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api<Campaign>("/campaigns/", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          goal: Number(goal),
          ngo_id: ngoId,
          donation_link: donationLink.trim() || null,
        }),
      });
      onCreated(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">NGO WORKSPACE</span>
            <h2>Create New Aid Campaign</h2>
          </div>
          <button className="icon-button close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert error">{error}</div>}

          <label>
            Campaign Title
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g. Emergency Clean Water for Southern Villages"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label>
            Description & Purpose
            <textarea
              required
              rows={4}
              minLength={10}
              placeholder="Detail how aid will be deployed, target beneficiaries, and logistics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Fundraising Goal (TND)
            <input
              type="number"
              step="0.001"
              min="1"
              required
              placeholder="e.g. 15000.000"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>

          <label>
            Public Donation URL (optional)
            <input
              type="url"
              placeholder="https://..."
              value={donationLink}
              onChange={(e) => setDonationLink(e.target.value)}
            />
          </label>

          <div className="modal-actions-row">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Creating Campaign..." : "Publish Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
