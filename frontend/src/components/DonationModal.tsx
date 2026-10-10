import React, { useState } from "react";
import type { Campaign, Donation } from "../types";
import { api } from "../api";

interface Props {
  campaign: Campaign;
  onClose: () => void;
  onDonated: (donation: Donation) => void;
}

export const DonationModal: React.FC<Props> = ({ campaign, onClose, onDonated }) => {
  const [amount, setAmount] = useState<number | string>(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [donationResult, setDonationResult] = useState<Donation | null>(null);

  const presets = [20, 50, 100, 250];

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid donation amount.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api<Donation>(`/campaigns/${campaign.id}/donations`, {
        method: "POST",
        body: JSON.stringify({
          campaign_id: campaign.id,
          amount: numAmount,
        }),
      });
      setDonationResult(res);
      onDonated(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record donation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card donation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">CONTRIBUTE TO HUMANITARIAN AID</span>
            <h2>Donate to {campaign.title}</h2>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {donationResult ? (
          <div className="modal-body success-donation">
            <div className="donation-success-icon">💚</div>
            <h3>Thank You for Your Generosity!</h3>
            <p className="muted">
              Your contribution of <strong>{Number(donationResult.amount).toFixed(3)} TND</strong> has been recorded in the platform audit ledger.
            </p>

            <div className="receipt-box">
              <span className="eyebrow">DONATION RECORD ID</span>
              <div className="receipt-token-row">
                <code>#{donationResult.id} (Status: {donationResult.status})</code>
              </div>
              <p className="receipt-hint">
                Once confirmed by the NGO admin, an official cryptographic Receipt Token will be issued, allowing you to track how your funds were spent across every Hedera-verified aid milestone.
              </p>
            </div>

            <button className="primary full" onClick={onClose}>
              Done & Return to Campaign
            </button>
          </div>
        ) : (
          <form onSubmit={handleDonate} className="donation-form">
            {error && <div className="alert error">{error}</div>}

            <div className="preset-row">
              {presets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={`preset-btn ${Number(amount) === preset ? "selected" : ""}`}
                  onClick={() => setAmount(preset)}
                >
                  {preset} TND
                </button>
              ))}
            </div>

            <label>
              Donation Amount (TND)
              <input
                type="number"
                step="0.001"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter custom amount..."
              />
            </label>

            <div className="security-notice">
              <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Protected by Amanah Hedera-backed verification ledger.</span>
            </div>

            <button type="submit" className="primary full" disabled={loading}>
              {loading ? "Recording Donation..." : `Confirm Donation of ${Number(amount || 0).toFixed(3)} TND`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
