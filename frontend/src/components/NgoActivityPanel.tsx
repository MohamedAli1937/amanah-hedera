import React, { useEffect, useState } from "react";
import type { AidEvent, Campaign, CampaignUpdate, Expense } from "../types";
import { api } from "../api";
import { hashscanTxUrl } from "../utils/network";
import { CreateEventModal } from "./CreateEventModal";
import { CreateUpdateModal } from "./CreateUpdateModal";
import { CreateExpenseModal } from "./CreateExpenseModal";

interface Props {
  campaigns: Campaign[];
}

type Tab = "all" | "milestones" | "updates" | "expenses";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "milestones", label: "Milestones" },
  { key: "updates", label: "Updates" },
  { key: "expenses", label: "Expenses" },
];

const STATUS_CLASS: Record<string, string> = {
  pending: "pill am",
  approved: "pill",
  rejected: "pill crit",
  confirmed: "pill",
  failed: "pill crit",
  not_anchored: "pill",
};

export const NgoActivityPanel: React.FC<Props> = ({ campaigns }) => {
  const [selectedCampId, setSelectedCampId] = useState<number | null>(
    campaigns.length > 0 ? campaigns[0].id : null
  );
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [milestones, setMilestones] = useState<AidEvent[]>([]);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Tab | null>(null);

  useEffect(() => {
    if (campaigns.length > 0 && !campaigns.some((c) => c.id === selectedCampId)) {
      setSelectedCampId(campaigns[0].id);
    }
  }, [campaigns, selectedCampId]);

  async function load() {
    if (selectedCampId === null) return;
    setLoading(true);
    try {
      const [m, u, e] = await Promise.all([
        api<AidEvent[]>(`/campaigns/${selectedCampId}/events/all`),
        api<CampaignUpdate[]>(`/campaigns/${selectedCampId}/updates`),
        api<Expense[]>(`/campaigns/${selectedCampId}/expenses`),
      ]);
      setMilestones(Array.isArray(m) ? m : []);
      setUpdates(Array.isArray(u) ? u : []);
      setExpenses(Array.isArray(e) ? e : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaign activity");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [selectedCampId]);

  const onCreated = () => {
    setModal(null);
    load();
  };

  const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());

  function row(
    key: string | number,
    title: string,
    detail: string,
    badge: string,
    amount: string | null,
    proof: string | null | undefined,
    hashscan: string | null | undefined,
    note?: string | null
  ) {
    return (
      <div
        key={key}
        style={{
          padding: "13px 15px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.75)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pill am" style={{ fontSize: 10 }}>{title}</span>
            <span className={STATUS_CLASS[badge] || "pill"} style={{ fontSize: 10 }}>{badge.toUpperCase()}</span>
          </div>
          <p style={{ fontSize: 13, color: "#41584F", lineHeight: 1.5, margin: "8px 0 0" }}>{detail}</p>
          {note && <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", margin: "6px 0 0" }}>Moderator note: {note}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {proof && (
              <a
                href={proof}
                target="_blank"
                rel="noreferrer"
                className="btn sec"
                style={{ fontSize: 11, minHeight: 30, padding: "0 11px", borderRadius: 10 }}
              >
                Proof ↗
              </a>
            )}
            {hashscan && (
              <a
                href={hashscan}
                target="_blank"
                rel="noreferrer"
                className="btn sec"
                style={{ fontSize: 11, minHeight: 30, padding: "0 11px", borderRadius: 10 }}
              >
                HashScan ↗
              </a>
            )}
          </div>
        </div>
        {amount && (
          <div
            style={{
              flex: "none",
              display: "grid",
              justifyItems: "end",
              alignContent: "center",
              padding: "8px 14px",
              borderRadius: 14,
              background: "rgba(6,64,47,0.08)",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 800, color: "#06402F", marginTop: 2 }}>{amount}</span>
          </div>
        )}
      </div>
    );
  }

  const visibleRows = () => {
    if (tab === "all") {
      type Item = {
        key: string | number;
        title: string;
        detail: string;
        badge: string;
        amount: string | null;
        proof: string | null;
        hashscan: string | null;
        note?: string | null;
        created: string | null;
      };
      const items: Item[] = [
        ...milestones.map((m) => ({
          key: `m-${m.id}`,
          title: `MILESTONE · ${m.event_type.toUpperCase()}`,
          detail: m.description,
          badge: m.review_status,
          amount: null,
          proof: m.proof_url,
          hashscan: m.hedera_status === "confirmed" ? hashscanTxUrl(m.hedera_transaction_id) : null,
          note: m.review_note,
          created: m.created_at,
        })),
        ...updates.map((u) => ({
          key: `u-${u.id}`,
          title: `UPDATE · ${u.kind.toUpperCase()}`,
          detail: u.message,
          badge: u.hedera_status,
          amount: null,
          proof: u.media_url,
          hashscan: u.hashscan_tx_url,
          created: u.created_at,
        })),
        ...expenses.map((e) => ({
          key: `e-${e.id}`,
          title: "EXPENSE",
          detail: e.description,
          badge: e.hedera_status || "not_anchored",
          amount: `$${Number(e.amount).toLocaleString()}`,
          proof: e.proof_url,
          hashscan: e.hashscan_tx_url ?? null,
          created: e.created_at,
        })),
      ];
      return items
        .filter((it) => matches(it.detail) && (status === "all" || it.badge === status))
        .sort((a, b) => (b.created || "").localeCompare(a.created || ""))
        .map((it) => row(it.key, it.title, it.detail, it.badge, it.amount, it.proof, it.hashscan, it.note));
    }
    if (tab === "milestones") {
      return milestones
        .filter((m) => matches(m.description) && (status === "all" || m.review_status === status))
        .map((m) =>
          row(
            m.id,
            m.event_type.toUpperCase(),
            m.description,
            m.review_status,
            null,
            m.proof_url,
            m.hedera_status === "confirmed" ? hashscanTxUrl(m.hedera_transaction_id) : null,
            m.review_note
          )
        );
    }
    if (tab === "updates") {
      return updates
        .filter((u) => matches(u.message) && (status === "all" || u.hedera_status === status))
        .map((u) =>
          row(u.id, u.kind.toUpperCase(), u.message, u.hedera_status, null, u.media_url, u.hashscan_tx_url)
        );
    }
    return expenses
      .filter((e) => matches(e.description) && (status === "all" || (e.hedera_status || "not_anchored") === status))
      .map((e) =>
        row(e.id, "EXPENSE", e.description, e.hedera_status || "not_anchored", `$${Number(e.amount).toLocaleString()}`, e.proof_url, e.hashscan_tx_url)
      );
  };

  const rows = visibleRows();

  return (
    <div className="card profile-campaigns-panel">
      <div className="profile-campaigns-header">
        <div>
          <h2 className="profile-section-title">Milestones, Updates & Expenses</h2>
        </div>
        {tab === "all" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn sec" disabled={campaigns.length === 0} onClick={() => setModal("milestones")}>+ Milestone</button>
            <button type="button" className="btn sec" disabled={campaigns.length === 0} onClick={() => setModal("updates")}>+ Update</button>
            <button type="button" className="btn sec" disabled={campaigns.length === 0} onClick={() => setModal("expenses")}>+ Expense</button>
          </div>
        ) : (
          <button
            type="button"
            className="btn am profile-create-btn"
            disabled={campaigns.length === 0}
            onClick={() => setModal(tab)}
          >
            + Add {tab === "milestones" ? "milestone" : tab === "updates" ? "update" : "expense"}
          </button>
        )}
      </div>

      <div style={{ padding: "4px 20px 20px" }}>
        {campaigns.length === 0 ? (
          <div className="profile-empty-state">Create a campaign first to record activity.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
              <select value={selectedCampId ?? ""} onChange={(e) => setSelectedCampId(Number(e.target.value))} style={{ maxWidth: 230, flex: "1 1 200px" }}>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              {TABS.map((t) => (
                <button key={t.key} type="button" className={`btn ${tab === t.key ? "am" : "sec"}`} onClick={() => { setTab(t.key); setStatus("all"); }} style={{ flex: "none" }}>
                  {t.label}
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>
                    {t.key === "all"
                      ? milestones.length + updates.length + expenses.length
                      : t.key === "milestones" ? milestones.length : t.key === "updates" ? updates.length : expenses.length}
                  </span>
                </button>
              ))}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search activity…"
                style={{ flex: "1 1 160px", minWidth: 130 }}
              />
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 150, flex: "none" }}>
                <option value="all">All statuses</option>
                {(tab === "milestones"
                  ? ["pending", "approved", "rejected"]
                  : tab === "all"
                  ? ["pending", "approved", "rejected", "confirmed", "failed", "not_anchored"]
                  : ["confirmed", "pending", "failed", "not_anchored"]
                ).map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>

            {error && <div className="auth-alert error">{error}</div>}
            {loading ? (
              <p style={{ fontSize: 13, color: "#64748b" }}>Loading activity…</p>
            ) : rows.length === 0 ? (
              <div className="profile-empty-state">No matching records for this filter.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{rows}</div>
            )}
          </>
        )}
      </div>

      {modal === "milestones" && selectedCampId !== null && (
        <CreateEventModal campaignId={selectedCampId} onClose={() => setModal(null)} onCreated={onCreated} />
      )}
      {modal === "updates" && selectedCampId !== null && (
        <CreateUpdateModal campaignId={selectedCampId} onClose={() => setModal(null)} onCreated={onCreated} />
      )}
      {modal === "expenses" && selectedCampId !== null && (
        <CreateExpenseModal campaignId={selectedCampId} onClose={() => setModal(null)} onCreated={onCreated} />
      )}
    </div>
  );
};

export default NgoActivityPanel;
