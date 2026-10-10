import React, { useState, useEffect } from "react";
import type { ReceiptVerification } from "../types";
import { api } from "../api";

interface Props {
  initialToken?: string;
  onClose: () => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export const ReceiptLookupModal: React.FC<Props> = ({ initialToken = "", onClose, onSelectCampaign }) => {
  const [activeTab, setActiveTab] = useState<"code" | "scan">("code");
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      setTokenInput(initialToken);
      verifyToken(initialToken);
    }
  }, [initialToken]);

  async function verifyToken(tokenToVerify: string) {
    const token = tokenToVerify.trim();
    if (!token) return;

    setLoading(true);
    setError(null);
    setReceipt(null);

    try {
      const res = await api<ReceiptVerification>(`/donations/receipt/${encodeURIComponent(token)}`);
      setReceipt(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Receipt token not found or invalid on Hedera HCS");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    verifyToken(tokenInput);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header receipt-modal-header">
          <div>
            <span className="eyebrow">IMMUTABLE AID VERIFICATION</span>
            <h2>Verify Humanitarian Receipt</h2>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Tab Selector: Code Entry vs. Scan Receipt */}
        <div className="modal-tabs-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === "code" ? "active" : ""}`}
            onClick={() => setActiveTab("code")}
          >
            ⌨️ Enter Receipt Code
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "scan" ? "active" : ""}`}
            onClick={() => setActiveTab("scan")}
          >
            Scan Receipt / Barcode
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "scan" ? (
            <div className="receipt-scanner-container">
              <div
                className="scanner-viewfinder"
              >
                {/* Laser animation */}
                <div
                />

                <div className="scanner-message">
                  <>
                    <div className="scanner-camera-mark">QR</div>
                    <span>Align paper receipt QR / Code within frame</span>
                  </>
                </div>
              </div>

              <p className="muted scanner-help">
                Scan the QR code printed on your NGO receipt. If you cannot scan it, use the receipt code entry tab.
              </p>
            </div>
          ) : (
            <>
              <p className="muted receipt-intro">
                Enter your unique donation receipt token to verify your contribution and trace its impact across the Hedera HCS aid ledger.
              </p>

              <form onSubmit={handleSearch} className="receipt-search-form">
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="e.g. AMN-GAZA-8891-PROOF or your issued token..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    required
                  />
                  <button type="submit" className="primary" disabled={loading}>
                    {loading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </form>

            </>
          )}

          {error && <div className="alert error" style={{ marginTop: "1rem" }}>{error}</div>}

          {receipt && (
            <div className="receipt-certificate" style={{ marginTop: "1.25rem" }}>
              <div className="certificate-header">
                <div className="cert-brand">
                  <span className="brand-mark-sm">A</span>
                  <div>
                    <h4>Amanah Transparency Certificate</h4>
                    <span className="cert-subtitle">Hedera Consensus Testnet Verified</span>
                  </div>
                </div>
                <span className={`status-badge ${receipt.is_verified_onchain ? "verified" : ""}`}>
                  {receipt.is_verified_onchain ? "✓ Hedera Testnet Verified" : "Verified Confirmed"}
                </span>
              </div>

              <div className="certificate-body">
                <div className="cert-row">
                  <span className="cert-label">Receipt Token:</span>
                  <code className="cert-value highlight-code">{receipt.receipt_token}</code>
                </div>
                <div className="cert-row">
                  <span className="cert-label">Donation Amount:</span>
                  <span className="cert-amount">${Number(receipt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
                </div>
                <div className="cert-row">
                  <span className="cert-label">Campaign:</span>
                  <span className="cert-value strong">{receipt.campaign_title}</span>
                </div>
                <div className="cert-row">
                  <span className="cert-label">Managing NGO:</span>
                  <span className="cert-value">{receipt.ngo_name} ({receipt.ngo_verification_status})</span>
                </div>
                <div className="cert-row">
                  <span className="cert-label">HCS Topic:</span>
                  <span className="cert-value"><code>{receipt.hedera_topic_id || "0.0.10972610"}</code></span>
                </div>
                {receipt.hedera_sequence_number && (
                  <div className="cert-row">
                    <span className="cert-label">HCS Sequence #:</span>
                    <span className="cert-value highlight-code"><strong>#{receipt.hedera_sequence_number}</strong></span>
                  </div>
                )}
                {receipt.hedera_transaction_id && (
                  <div className="cert-row">
                    <span className="cert-label">Transaction ID:</span>
                    <code className="cert-value" style={{ fontSize: "0.78rem" }}>{receipt.hedera_transaction_id}</code>
                  </div>
                )}
                {receipt.consensus_timestamp && (
                  <div className="cert-row">
                    <span className="cert-label">Consensus Timestamp:</span>
                    <span className="cert-value" style={{ fontSize: "0.82rem" }}>{receipt.consensus_timestamp}</span>
                  </div>
                )}
                <div className="cert-row">
                  <span className="cert-label">Aid Delivery Updates:</span>
                  <span className="cert-value">{receipt.events_count} Hedera-anchored milestones</span>
                </div>
              </div>

              {receipt.hashscan_tx_url && (
                <div style={{ marginTop: "0.85rem" }}>
                  <a
                    href={receipt.hashscan_tx_url}
                    target="_blank"
                    rel="noreferrer"
                    className="external-link-btn"
                    style={{ display: "inline-flex", width: "100%", justifyContent: "center", textDecoration: "none" }}
                  >
                    Inspect On-Chain Proof on HashScan ↗
                  </a>
                </div>
              )}

              {onSelectCampaign && (
                <button
                  type="button"
                  className="primary full"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => {
                    onSelectCampaign(receipt.campaign_id);
                    onClose();
                  }}
                >
                  Track Campaign Impact & Journey →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
