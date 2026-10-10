import React, { useState, useEffect } from "react";
import type { AidEvent, AidEventVerification } from "../types";
import { api } from "../api";

interface Props {
  event: AidEvent;
  onClose: () => void;
  onAnchored?: (updatedEvent: AidEvent) => void;
}

export const HederaProofModal: React.FC<Props> = ({ event, onClose, onAnchored }) => {
  const [loading, setLoading] = useState(true);
  const [reanchoring, setReanchoring] = useState(false);
  const [verification, setVerification] = useState<AidEventVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api<AidEventVerification>(`/events/${event.id}/verify`)
      .then((data) => {
        if (isMounted) setVerification(data);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Verification failed");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [event.id]);

  async function handleAnchor() {
    setReanchoring(true);
    setError(null);
    try {
      const updated = await api<AidEvent>(`/events/${event.id}/anchor`, { method: "POST" });
      const verifyData = await api<AidEventVerification>(`/events/${event.id}/verify`);
      setVerification(verifyData);
      if (onAnchored) onAnchored(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anchor submission failed");
    } finally {
      setReanchoring(false);
    }
  }

  function copyPayload() {
    if (!verification) return;
    navigator.clipboard.writeText(JSON.stringify(verification.canonical_payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card hedera-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="badge hedera-badge">
              <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Hedera Consensus Service (HCS)
            </span>
            <h2>Cryptographic Proof Audit</h2>
            <p className="modal-sub">Milestone #{event.id}: {event.event_type.toUpperCase()}</p>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Querying Hedera consensus proof & computing cryptographic SHA-256...</p>
          </div>
        ) : error ? (
          <div className="modal-body">
            <div className="alert error">{error}</div>
            {event.hedera_status !== "confirmed" && (
              <div className="action-row" style={{ marginTop: "1rem" }}>
                <button className="primary" disabled={reanchoring} onClick={handleAnchor}>
                  {reanchoring ? "Anchoring on Hedera..." : "Anchor to Hedera HCS Now"}
                </button>
              </div>
            )}
          </div>
        ) : verification ? (
          <div className="modal-body">
            {verification.is_valid ? (
              <div className="consensus-banner verified">
                <div className="consensus-icon">✓</div>
                <div>
                  <strong>Cryptographic Integrity Verified</strong>
                  <p>The stored event data matches its canonical SHA-256 digest on Hedera Consensus Service.</p>
                </div>
              </div>
            ) : (
              <div className="consensus-banner pending">
                <div className="consensus-icon">!</div>
                <div>
                  <strong>Status: {verification.hedera_status.toUpperCase()}</strong>
                  <p>Consensus anchoring status is {verification.hedera_status}.</p>
                </div>
              </div>
            )}

            <div className="proof-grid">
              <div className="proof-cell">
                <label>Hedera Network</label>
                <code>Hedera Testnet</code>
              </div>
              <div className="proof-cell">
                <label>HCS Topic ID</label>
                <code>{verification.hedera_topic_id || "0.0.10972610"}</code>
              </div>
              <div className="proof-cell">
                <label>Consensus Sequence #</label>
                <code className="highlight-code">
                  {verification.hedera_sequence_number ? `#${verification.hedera_sequence_number}` : "Pending"}
                </code>
              </div>
              <div className="proof-cell">
                <label>Transaction ID</label>
                <code className="truncate-text" title={verification.hedera_transaction_id || ""}>
                  {verification.hedera_transaction_id || "Pending"}
                </code>
              </div>
            </div>

            <div className="hash-box">
              <div className="hash-row">
                <span className="hash-label">SHA-256 Digest:</span>
                <code className="hash-code">{verification.calculated_hash}</code>
              </div>
              <div className="hash-match">
                {verification.stored_hash === verification.calculated_hash ? (
                  <span className="status-badge verified">Hash Match Confirmed</span>
                ) : (
                  <span className="status-badge rejected">Hash Mismatch</span>
                )}
              </div>
            </div>

            <div className="payload-section">
              <div className="payload-header">
                <span>Canonical JSON Hashed for Consensus:</span>
                <button className="text-btn" onClick={copyPayload}>
                  {copied ? "Copied!" : "Copy Payload"}
                </button>
              </div>
              <pre className="code-block">
                {JSON.stringify(verification.canonical_payload, null, 2)}
              </pre>
            </div>

            <div className="modal-actions-row">
              {verification.hashscan_tx_url && (
                <a
                  href={verification.hashscan_tx_url}
                  target="_blank"
                  rel="noreferrer"
                  className="external-link-btn"
                >
                  Inspect on HashScan Explorer ↗
                </a>
              )}
              {verification.hashscan_topic_url && (
                <a
                  href={verification.hashscan_topic_url}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary text-sm"
                >
                  View Topic Messages ↗
                </a>
              )}
              {verification.hedera_status !== "confirmed" && (
                <button className="primary" disabled={reanchoring} onClick={handleAnchor}>
                  {reanchoring ? "Anchoring..." : "Retry Anchor"}
                </button>
              )}
              <button className="secondary" onClick={onClose} style={{ marginLeft: "auto" }}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
