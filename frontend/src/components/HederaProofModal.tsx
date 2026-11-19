import React, { useState, useEffect } from "react";
import type { AidEvent, AidEventVerification } from "../types";
import { api } from "../api";
import { getNetworkConfig, hashscanTxUrl } from "../utils/network";

interface Props {
  event: AidEvent;
  onClose: () => void;
  onAnchored?: (updatedEvent: AidEvent) => void;
}

export const HederaProofModal: React.FC<Props> = ({
  event,
  onClose,
  onAnchored,
}) => {
  const [loading, setLoading] = useState(true);
  const [reanchoring, setReanchoring] = useState(false);
  const [verification, setVerification] =
    useState<AidEventVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [networkTopicId, setNetworkTopicId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getNetworkConfig().then((config) => {
      if (active) setNetworkTopicId(config.topic_id);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api<AidEventVerification>(`/events/${event.id}/verify`)
      .then((data) => {
        if (isMounted) setVerification(data);
      })
      .catch((err) => {
        if (isMounted)
          setError(
            err instanceof Error ? err.message : "Verification failed"
          );
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
      const updated = await api<AidEvent>(`/events/${event.id}/anchor`, {
        method: "POST",
      });
      const verifyData = await api<AidEventVerification>(
        `/events/${event.id}/verify`
      );
      setVerification(verifyData);
      if (onAnchored) onAnchored(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Anchor submission failed"
      );
    } finally {
      setReanchoring(false);
    }
  }

  const txId =
    event.hedera_transaction_id || verification?.hedera_transaction_id || "";
  const hashscanUrl =
    verification?.hashscan_tx_url || hashscanTxUrl(txId) || undefined;
  const displayHash =
    verification?.calculated_hash ||
    verification?.stored_hash ||
    event.event_hash;

  const isConfirmed = event.hedera_status === "confirmed";

  function copyText(
    value: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    navigator.clipboard.writeText(value);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  return (
    <div className="modal-backdrop-frosted" onClick={onClose}>
      <div
        className="modal-card-frosted proof-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="proof-modal-header">
          <div className="proof-title-group">
            <div className="proof-badge-icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M7 5v14M17 5v14M7 10h10M7 14h10" />
              </svg>
            </div>
            <div>
              <span className="eyebrow">Hedera Consensus Service</span>
              <h2 className="proof-modal-title">Cryptographic Proof</h2>
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

        <div
          className={`proof-status-well ${
            loading ? "is-checking" : isConfirmed ? "is-verified" : "is-pending"
          }`}
        >
          <span className="proof-status-dot" aria-hidden="true" />
          <span className="proof-status-text">
            {loading
              ? "Verifying Hedera consensus record..."
              : isConfirmed
              ? "Confirmed on Hedera Consensus Service"
              : "Awaiting HCS Consensus Confirmation"}
          </span>
          <span className={`pill ${isConfirmed ? "" : "am"}`}>
            {loading ? "Checking" : isConfirmed ? "Immutable" : "Pending"}
          </span>
        </div>

        {error && <div className="auth-alert error">{error}</div>}

        <div className="proof-meta-grid">
          <div className="proof-meta-cell">
            <span className="proof-meta-label">Event Type</span>
            <span className="proof-meta-value capitalize">
              {event.event_type}
            </span>
          </div>

          <div className="proof-meta-cell">
            <span className="proof-meta-label">Timestamp (UTC)</span>
            <span className="proof-meta-value mono">
              {event.created_at
                ? event.created_at.replace("T", " ").slice(0, 19)
                : "—"}
            </span>
          </div>

          <div className="proof-meta-cell">
            <span className="proof-meta-label">HCS Topic ID</span>
            <span className="proof-meta-value mono">
              {event.hedera_topic_id || networkTopicId || "—"}
            </span>
          </div>

          <div className="proof-meta-cell">
            <span className="proof-meta-label">Sequence Number</span>
            <span className="proof-meta-value mono">
              {event.hedera_sequence_number
                ? `#${event.hedera_sequence_number}`
                : "Consensus ordered"}
            </span>
          </div>
        </div>

        <div className="proof-section">
          <label>Hedera Transaction ID</label>
          <div className="proof-copy-well">
            <span className="proof-well-code mono" title={txId}>
              {txId}
            </span>
            <button
              type="button"
              className="proof-copy-btn"
              aria-label="Copy transaction ID"
              title={copiedTx ? "Copied!" : "Copy transaction ID"}
              onClick={() => copyText(txId, setCopiedTx)}
            >
              {copiedTx ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5h10" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {displayHash && (
          <div className="proof-section">
            <label>SHA-256 Event Digest</label>
            <div className="proof-copy-well is-hash">
              <span className="proof-well-hash mono">{displayHash}</span>
              <button
                type="button"
                className="proof-copy-btn"
                aria-label="Copy SHA-256 hash"
                title={copiedHash ? "Copied!" : "Copy SHA-256 hash"}
                onClick={() => copyText(displayHash, setCopiedHash)}
              >
                {copiedHash ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5h10" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="proof-footer">
          {verification?.canonical_payload ? (
            <button
              type="button"
              className="btn sec"
              onClick={() =>
                copyText(
                  JSON.stringify(verification.canonical_payload, null, 2),
                  setCopiedPayload
                )
              }
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5h10" />
              </svg>
              <span>{copiedPayload ? "Copied JSON" : "Copy Payload"}</span>
            </button>
          ) : (
            <span />
          )}

          <div className="proof-footer-right">
            {!isConfirmed && (
              <button
                type="button"
                className="btn sec"
                disabled={reanchoring}
                onClick={handleAnchor}
              >
                {reanchoring ? "Anchoring..." : "Anchor to HCS"}
              </button>
            )}

            <a
              href={hashscanUrl}
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
          </div>
        </div>
      </div>
    </div>
  );
};