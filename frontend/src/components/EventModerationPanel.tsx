import React, { useEffect, useState } from "react";
import { api } from "../api";

interface PendingEvent {
  id: number;
  campaign_id: number;
  campaign_title: string;
  ngo_name: string;
  event_type: string;
  description: string;
  proof_url: string | null;
  created_at: string | null;
  review_status: string;
  hedera_status: string;
}

const EVENT_LABELS: Record<string, string> = {
  purchase: "Procurement",
  shipment: "Shipment",
  arrival: "Arrival",
  distribution: "Distribution",
  completed: "Completed",
};

export const EventModerationPanel: React.FC = () => {
  const [items, setItems] = useState<PendingEvent[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<PendingEvent[]>("/moderation/events");
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load milestone queue");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(eventId: number, decision: "approve" | "reject") {
    setBusyId(eventId);
    setError(null);
    setMessage(null);
    try {
      await api(`/events/${eventId}/review`, {
        method: "POST",
        body: JSON.stringify({ decision, note: notes[eventId]?.trim() || null }),
      });
      setMessage(decision === "approve" ? "Milestone approved and anchored on Hedera." : "Milestone rejected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review milestone");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card mod-table-card" style={{ marginTop: "18px" }}>
      <div className="profile-campaigns-header" style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {items.length > 0 && <span className="pill am">{items.length} Pending</span>}
          <button type="button" className="btn sec" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div className="auth-alert error" style={{ margin: "12px 20px 0" }}>{error}</div>}
      {message && <div className="auth-alert success" style={{ margin: "12px 20px 0" }}>{message}</div>}

      <div className="mod-table-scroll" style={{ padding: "12px 20px 20px" }}>
        {items.length === 0 ? (
          <div className="profile-empty-state">No aid milestones are waiting for review.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "14px 16px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(255,255,255,0.75)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span className="pill am" style={{ fontSize: "10px" }}>
                        {EVENT_LABELS[item.event_type] || item.event_type}
                      </span>
                      <strong style={{ fontSize: "13px", color: "#0B2A22" }}>{item.campaign_title}</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{item.ngo_name}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#41584F", lineHeight: 1.5, margin: "8px 0" }}>
                      {item.description}
                    </p>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      {item.proof_url && (
                        <a href={item.proof_url} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#0F6B4F", fontWeight: 800 }}>
                          View submitted proof ↗
                        </a>
                      )}
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        Submitted {item.created_at ? new Date(item.created_at).toLocaleDateString() : "recently"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap", marginTop: "12px" }}>
                  <div style={{ flex: "1 1 260px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>Review note (optional)</label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="Why approving or rejecting…"
                      value={notes[item.id] || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      style={{ width: "100%", marginTop: "4px" }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn sec"
                    disabled={busyId === item.id}
                    onClick={() => review(item.id, "reject")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn am"
                    disabled={busyId === item.id}
                    onClick={() => review(item.id, "approve")}
                  >
                    {busyId === item.id ? "Working…" : "Approve & anchor"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventModerationPanel;
