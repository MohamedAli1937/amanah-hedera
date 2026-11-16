import React, { useState, useMemo, useEffect } from "react";
import type { LedgerTransaction } from "../types";
import { getNetworkConfig, hashscanTopicUrl, hashscanTxUrl } from "../utils/network";

interface Props {
  transactions: LedgerTransaction[];
  selectedCampaignFilterInitial?: string;
  onBack?: () => void;
  onOpenReceipt?: (receiptCode: string) => void;
  onOpenTxAudit: (tx: LedgerTransaction) => void;
}

export const LedgerPage: React.FC<Props> = ({
  transactions,
  selectedCampaignFilterInitial = "all",
  onBack,
  onOpenReceipt,
  onOpenTxAudit,
}) => {
  const [campaignFilter, setCampaignFilter] = useState(selectedCampaignFilterInitial);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicUrl, setTopicUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getNetworkConfig().then((config) => {
      if (active) setTopicUrl(hashscanTopicUrl(config.topic_id));
    });
    return () => { active = false; };
  }, []);

  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.campaign_name) set.add(tx.campaign_name);
    });
    return Array.from(set);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (
        campaignFilter !== "all" &&
        !tx.campaign_name.toLowerCase().includes(campaignFilter.toLowerCase())
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCampaign = tx.campaign_name.toLowerCase().includes(q);
        const matchesTx = tx.tx_id.toLowerCase().includes(q);
        const matchesSender = (tx.sender || "").toLowerCase().includes(q);
        const matchesReceipt = (tx.receipt_code || "").toLowerCase().includes(q);
        return matchesCampaign || matchesTx || matchesSender || matchesReceipt;
      }
      return true;
    });
  }, [transactions, campaignFilter, searchQuery]);

  return (
    <div className="wrap">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {onBack && (
            <button
              type="button"
              className="btn ib sec"
              onClick={onBack}
              aria-label="Back to map"
              title="Back to map"
              style={{ width: "40px", height: "40px", minHeight: "40px" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>
        <a
          href={topicUrl ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="btn ib am"
          aria-label="Open HashScan"
          title="Open Topic on HashScan"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 4h6v6M20 4L10 14M18 14v6H4V6h6" />
          </svg>
        </a>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ width: "300px" }}>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            aria-label="Campaign filter"
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
            }}
          >
            <option value="all">All campaigns · {transactions.length}</option>
            {uniqueCampaigns.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <input
            type="text"
            placeholder="Search Tx ID, campaign, receipt"
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
            }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card frosted" style={{ padding: 0, overflow: "hidden" }}>
        {/* Table Header */}
        <div
          className="trow"
          style={{
            background: "#06402F",
            color: "#BFE3D2",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: ".1em",
            border: 0,
          }}
        >
          <span>TRANSACTION</span>
          <span>CAMPAIGN</span>
          <span>MILESTONE</span>
          <span>UTC TIME</span>
          <span>STATUS</span>
        </div>

        {/* Rows */}
        {filteredTransactions.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            No ledger transactions matched your filters.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const shortTx =
              tx.tx_id.length > 20
                ? `${tx.tx_id.slice(0, 10)}…${tx.tx_id.slice(-6)}`
                : tx.tx_id;

            const milestone = (tx.allocation_title || "DONATION").toUpperCase();
            const milestoneClass =
              milestone === "PURCHASE" || milestone === "SHIPMENT"
                ? "pill am"
                : milestone === "CRITICAL"
                ? "pill crit"
                : "pill";

            const hashscanUrl = tx.hashscan_url || hashscanTxUrl(tx.tx_id) || undefined;

            return (
              <div key={tx.id} className="trow">
                <span className="mono" style={{ fontSize: "13px" }}>
                  {shortTx}{" "}
                  <a
                    href={hashscanUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0B5CAD", fontWeight: 700, textDecoration: "none", marginLeft: "4px" }}
                  >
                    HashScan
                  </a>
                </span>

                <b
                  style={{
                    color: "#0B2A22",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: "8px",
                  }}
                >
                  {tx.campaign_name}
                </b>

                <span>
                  <span className={milestoneClass}>{milestone}</span>
                </span>

                <span className="mono" style={{ fontSize: "13px", color: "#41584F" }}>
                  {tx.date_time}
                </span>

                <span style={{ display: "flex", gap: "10px", alignItems: "center", color: "#0F6B4F" }}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12l3 3 5-6" />
                  </svg>
                  <button
                    type="button"
                    className="btn ib sec"
                    aria-label="View proof"
                    title="View Hedera cryptographic proof"
                    style={{ width: "36px", height: "36px", minHeight: "36px" }}
                    onClick={() => onOpenTxAudit(tx)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                      <path d="M8.5 12l2.5 2.5 4.5-5" />
                    </svg>
                  </button>
                  {tx.receipt_code && onOpenReceipt && (
                    <button
                      type="button"
                      className="pill"
                      style={{ cursor: "pointer", background: "#FEF3C7", color: "#8A4B08", border: 0 }}
                      onClick={() => onOpenReceipt(tx.receipt_code)}
                      title={`Verify receipt: ${tx.receipt_code}`}
                    >
                      Receipt
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
