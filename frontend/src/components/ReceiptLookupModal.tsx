import React, { useState, useEffect } from "react";
import type { ReceiptVerification } from "../types";
import { api } from "../api";
import { ReceiptPairingPanel } from "./ReceiptPairingPanel";
import { ReceiptQr } from "./ReceiptQr";

interface Props {
  initialToken?: string;
  onClose: () => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export const ReceiptLookupModal: React.FC<Props> = ({
  initialToken = "",
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"scan" | "code">("scan");
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      setTokenInput(initialToken);
      verifyToken(initialToken);
      setActiveTab("code");
    }
  }, [initialToken]);

  async function verifyToken(tokenToVerify: string) {
    const token = tokenToVerify.trim();
    if (!token) return;

    setLoading(true);
    setError(null);
    setReceipt(null);

    try {
      const res = await api<ReceiptVerification>(
        `/donations/receipt/${encodeURIComponent(token)}`
      );
      setReceipt(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Receipt token not found or invalid on Hedera HCS"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    verifyToken(tokenInput);
  }

  function switchTab(tab: "scan" | "code") {
    setActiveTab(tab);
    setReceipt(null);
    setError(null);
  }

  return (
    <div className="modal-backdrop-frosted" onClick={onClose}>
      <div
        className="modal-card-frosted receipt-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="receipt-modal-header">
          <div className="receipt-title-group">
            <div className="receipt-badge-icon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <path d="M14 14h3v3M20 14v6h-6" />
              </svg>
            </div>
            <div>
              <span className="eyebrow">Hedera HCS Audit</span>
              <h2 className="receipt-modal-title">Verify Receipt</h2>
            </div>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="receipt-seg" role="tablist" aria-label="Verification method">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "scan"}
            className={`receipt-seg-btn ${activeTab === "scan" ? "is-active" : ""}`}
            onClick={() => switchTab("scan")}
          >
            Scan QR
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "code"}
            className={`receipt-seg-btn ${activeTab === "code" ? "is-active" : ""}`}
            onClick={() => switchTab("code")}
          >
            Enter Code
          </button>
        </div>

        {activeTab === "scan" && (
          <ReceiptPairingPanel
            onReceipt={(verified) => {
              setReceipt(verified);
              setError(null);
              setActiveTab("code");
            }}
          />
        )}

        {activeTab === "code" && (
          <form onSubmit={handleSearch} className="receipt-code-form">
            <div>
              <label>Receipt Token</label>
              <input
                type="text"
                className="mono"
                placeholder="e.g. REC-584743 or receipt token"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  if (receipt) setReceipt(null);
                  if (error) setError(null);
                }}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="btn am receipt-submit-btn"
            >
              {loading ? "Verifying on Hedera..." : "Verify Receipt"}
            </button>
          </form>
        )}

        {error && <div className="auth-alert error receipt-alert">{error}</div>}

        {receipt && (
          <div className="receipt-result-card">
            <div className="receipt-result-banner">
              <span className="proof-status-dot" aria-hidden="true" />
              <span className="receipt-result-status">
                Authentic Hedera HCS Record
              </span>
              <span className="pill">Verified</span>
            </div>

            <div className="receipt-meta-grid">
              <div className="receipt-meta-cell">
                <span className="receipt-meta-label">Campaign</span>
                <span className="receipt-meta-value">
                  {receipt.campaign_title}
                </span>
              </div>

              <div className="receipt-meta-cell">
                <span className="receipt-meta-label">Amount</span>
                <span className="receipt-meta-value is-amount mono">
                  ${Number(receipt.amount).toLocaleString()}
                </span>
              </div>

              {receipt.donor_name && (
                <div className="receipt-meta-cell">
                  <span className="receipt-meta-label">Donor</span>
                  <span className="receipt-meta-value">
                    {receipt.donor_name}
                  </span>
                </div>
              )}

              {receipt.hedera_sequence_number && (
                <div className="receipt-meta-cell">
                  <span className="receipt-meta-label">HCS Sequence</span>
                  <span className="receipt-meta-value mono">
                    #{receipt.hedera_sequence_number}
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "center",
                padding: "12px 0",
                borderTop: "1px solid rgba(6,64,47,0.12)",
                borderBottom: "1px solid rgba(6,64,47,0.12)",
              }}
            >
              <ReceiptQr token={receipt.receipt_token} size={96} label="Receipt QR" />
              <div style={{ minWidth: 0 }}>
                <span className="receipt-meta-label">Receipt code</span>
                <span className="mono" style={{ display: "block", fontSize: "12px", wordBreak: "break-all", color: "#0B2A22" }}>
                  {receipt.receipt_token}
                </span>
                <span style={{ display: "block", marginTop: "6px", fontSize: "11px", color: "#64748b", lineHeight: 1.45 }}>
                  Scan this QR on a phone to send the receipt to a paired screen.
                </span>
              </div>
            </div>

            <div className="receipt-result-actions">
              <button
                type="button"
                className="btn sec"
                onClick={() => {
                  setReceipt(null);
                  setError(null);
                  setTokenInput("");
                }}
              >
                Verify Another
              </button>

              {receipt.hashscan_tx_url && (
                <a
                  href={receipt.hashscan_tx_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn am"
                >
                  <span>View on HashScan</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 4h6v6M20 4L10 14M18 14v6H4V6h6" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};