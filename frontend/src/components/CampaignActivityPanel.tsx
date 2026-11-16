import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { ChainLink } from "../types";

interface Props {
  campaignId: number;
  expanded?: boolean;
}

const STAGE_DOT: Record<string, string> = {
  donation: "#6FAE93",
  expense: "#C9A659",
  shipment: "#7D9FC0",
  distribution: "#9C8ABF",
  update: "#8FB8C9",
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const iconBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  minHeight: 26,
  padding: 0,
  borderRadius: 9,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.5)",
  boxShadow: "2px 2px 5px rgba(6,64,47,0.08), -2px -2px 5px rgba(255,255,255,0.9)",
  color: "#0F6B4F",
  flex: "none",
};

function ProofIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15h6M9 18h4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
    </svg>
  );
}

export const CampaignActivityPanel: React.FC<Props> = ({ campaignId, expanded = false }) => {
  const [chain, setChain] = useState<ChainLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<ChainLink[]>(`/campaigns/${campaignId}/chain`)
      .then((data) => {
        if (active) setChain(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setChain([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  return (
    <div
      style={{
        flex: expanded ? "1 1 auto" : "0 1 auto",
        minHeight: expanded ? "160px" : "72px",
        maxHeight: expanded ? "none" : "210px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.42)",
        border: "1px solid rgba(255,255,255,0.7)",
        borderRadius: 18,
        padding: "11px 13px",
        boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.8), 4px 4px 12px rgba(6,64,47,0.06), -3px -3px 10px rgba(255,255,255,0.7)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: "none", marginBottom: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Aid progress
        </span>
        <span style={{ fontSize: 9, color: "#94a3b8" }}>{chain.length} records</span>
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", paddingRight: "4px", display: "flex", flexDirection: "column", gap: 6 }}>
        {loading && <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Loading activity…</p>}
        {!loading && chain.length === 0 && (
          <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            No activity yet. Verified donations, expenses and updates will appear here.
          </p>
        )}

        {!loading &&
          chain.map((link) => (
            <div
              key={link.record_id}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                padding: "8px 10px",
                borderRadius: 13,
                background: "rgba(255,255,255,0.5)",
                boxShadow: "2px 2px 6px rgba(6,64,47,0.06), -2px -2px 6px rgba(255,255,255,0.85)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  marginTop: 5,
                  flex: "none",
                  background: STAGE_DOT[link.stage] || "#9CA3AF",
                  boxShadow: "0 0 0 3px rgba(255,255,255,0.6)",
                }}
              />
              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#0B2A22" }}>{link.title}</span>
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>{formatDate(link.created_at)}</span>
                  {link.hedera_status === "confirmed" && (
                    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: "#0F6B4F" }}>✓ ON-CHAIN</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.45, margin: "3px 0 0" }}>{link.detail}</p>
              </div>

              <div style={{ display: "flex", gap: 5, alignItems: "center", flex: "none" }}>
                {link.amount !== null && link.amount !== undefined && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#06402F",
                      padding: "4px 7px",
                      borderRadius: 9,
                      boxShadow: "inset 2px 2px 4px rgba(6,64,47,0.08), inset -2px -2px 4px rgba(255,255,255,0.9)",
                    }}
                  >
                    ${Number(link.amount).toLocaleString()}
                  </span>
                )}
                {link.proof_url && (
                  <a href={link.proof_url} target="_blank" rel="noreferrer" style={iconBtn} title="View proof" aria-label="View proof">
                    <ProofIcon />
                  </a>
                )}
                {link.hashscan_tx_url && (
                  <a href={link.hashscan_tx_url} target="_blank" rel="noreferrer" style={iconBtn} title="View on HashScan" aria-label="View on HashScan">
                    <LinkIcon />
                  </a>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default CampaignActivityPanel;
