import { useState, useMemo } from "react";
import type { LedgerTransaction } from "../types";

interface Props {
  transactions: LedgerTransaction[];
  selectedCampaignFilterInitial?: string;
  onOpenReceipt?: (receiptCode: string) => void;
  onOpenTxAudit: (tx: LedgerTransaction) => void;
}

export const LedgerPage: React.FC<Props> = ({
  transactions,
  selectedCampaignFilterInitial = "all",
  onOpenReceipt: _onOpenReceipt,
  onOpenTxAudit,
}) => {
  const [campaignFilter, setCampaignFilter] = useState(selectedCampaignFilterInitial);
  const [searchQuery, setSearchQuery] = useState("");

  // Extract unique campaign names from real transactions
  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.campaign_name) set.add(tx.campaign_name);
    });
    return Array.from(set);
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Campaign filter
      if (
        campaignFilter !== "all" &&
        !tx.campaign_name.toLowerCase().includes(campaignFilter.toLowerCase())
      ) {
        return false;
      }
      // Search
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
    <div className="ledger-real-page-layout">
      {/* Header */}
      <div className="ledger-real-header">
        <div className="ledger-title-strip">
          <div className="hedera-live-beacon">
            <span className="pulsing-emerald-dot"></span>
            <span className="beacon-text">HEDERA CONSENSUS SERVICE (HCS)</span>
            <span className="topic-badge">Topic ID: 0.0.10972610</span>
          </div>
          <h1 className="page-heading-title">Immutable Verification Ledger</h1>
          <p className="ledger-page-subtitle">
            Every humanitarian milestone, expense invoice, and aid distribution event is anchored to
            Hedera Hashgraph testnet with sub-second Byzantine Fault Tolerant finality.
          </p>
        </div>

        {/* Quick Hedera Explorer Link */}
        <div className="hedera-topic-link-box">
          <span className="topic-label">Hedera Testnet Topic</span>
          <a
            href="https://hashscan.io/testnet/topic/0.0.10972610"
            target="_blank"
            rel="noreferrer"
            className="btn-hashscan-topic"
            title="Inspect Topic on HashScan"
          >
            <span>0.0.10972610 on HashScan</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="ledger-real-filter-bar">
        <div className="filter-group-left">
          <label>Filter by Campaign:</label>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="campaign-select-box"
          >
            <option value="all">All Campaigns ({transactions.length} records)</option>
            {uniqueCampaigns.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {campaignFilter !== "all" && (
            <button
              className="btn-clear-campaign-filter"
              onClick={() => setCampaignFilter("all")}
            >
              Clear Filter ✕
            </button>
          )}
        </div>

        <div className="filter-group-right">
          <div className="search-ledger-input-wrap">
            <svg
              className="icon-search-sm"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by Tx ID, Campaign, Receipt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real Hedera Consensus Table */}
      <div className="ledger-real-table-wrapper">
        <table className="ledger-real-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "26%" }}>
                Hedera Transaction ID / Explorer
              </th>
              <th scope="col" style={{ width: "24%" }}>
                Campaign
              </th>
              <th scope="col" style={{ width: "16%" }}>
                Milestone Action
              </th>
              <th scope="col" style={{ width: "16%" }}>
                Timestamp (UTC)
              </th>
              <th scope="col" style={{ width: "18%" }}>
                HCS Consensus Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-ledger-row">
                  <div className="empty-ledger-content">
                    <span className="empty-icon">🔍</span>
                    <h4>No consensus transactions found</h4>
                    <p>Try resetting the campaign filter or search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} onClick={() => onOpenTxAudit(tx)}>
                  {/* Transaction ID & HashScan Link */}
                  <td className="cell-tx-id">
                    <div className="tx-link-row">
                      <code className="tx-code-mono" title={tx.tx_id}>
                        {tx.tx_id.length > 22
                          ? `${tx.tx_id.slice(0, 14)}...${tx.tx_id.slice(-6)}`
                          : tx.tx_id}
                      </code>

                      {tx.hashscan_url && (
                        <a
                          href={tx.hashscan_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hashscan-link-chip"
                          onClick={(e) => e.stopPropagation()}
                          title="View on HashScan Testnet"
                        >
                          HashScan ↗
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Campaign */}
                  <td className="cell-campaign-title">
                    <strong className="campaign-strong">{tx.campaign_name}</strong>
                  </td>

                  {/* Milestone Action */}
                  <td className="cell-milestone">
                    <span className="milestone-badge">
                      {tx.allocation_title || "Verified Milestone"}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="cell-timestamp">
                    <span className="timestamp-mono">{tx.date_time}</span>
                  </td>

                  {/* Status & Verify Action */}
                  <td className="cell-status-action">
                    <div className="status-button-group">
                      <span className="badge-confirmed-hcs">
                        <span className="dot-green">✓</span> Confirmed by HCS
                      </span>
                      <button
                        className="btn-audit-proof"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTxAudit(tx);
                        }}
                      >
                        Audit Proof
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
