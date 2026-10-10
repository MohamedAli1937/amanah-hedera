import React, { useEffect, useState } from "react";
import type { UserProfile, Campaign, NGO, User, NGOStatus } from "../types";
import { api } from "../api";
import { CreateCampaignModal } from "./CreateCampaignModal";

interface Props {
  profile: UserProfile;
  user: User | null;
  campaigns?: Campaign[];
  dashboardError?: string | null;
  ngoStatus?: NGOStatus | null;
  onOpenCampaign: (campaignId: number) => void;
  onDonationRecorded?: () => void;
}

export const ProfilePage: React.FC<Props> = ({
  profile,
  user,
  campaigns = [],
  dashboardError = null,
  ngoStatus = null,
  onOpenCampaign,
  onDonationRecorded,
}) => {
  // NGO Aid Intake state
  const [selectedCampId, setSelectedCampId] = useState<number>(
    campaigns.length > 0 ? campaigns[0].id : 0
  );
  const [intakeAmount, setIntakeAmount] = useState<number>(100);
  const [donorName, setDonorName] = useState<string>("");
  const [submittingIntake, setSubmittingIntake] = useState<boolean>(false);
  const [intakeSuccess, setIntakeSuccess] = useState<{
    receipt_token: string;
    amount: number;
    campaign_title: string;
    donor_name?: string;
    hedera_sequence_number?: number;
    hedera_transaction_id?: string;
  } | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [pendingNgos, setPendingNgos] = useState<NGO[]>([]);
  const [ngoActionError, setNgoActionError] = useState<string | null>(null);

  useEffect(() => {
    if (campaigns.length > 0 && !campaigns.some((campaign) => campaign.id === selectedCampId)) {
      setSelectedCampId(campaigns[0].id);
    }
  }, [campaigns, selectedCampId]);

  async function loadNgos() {
    if (user?.role !== "platform_admin") return;
    try {
      setPendingNgos(await api<NGO[]>("/ngos/"));
    } catch (err) {
      setNgoActionError(err instanceof Error ? err.message : "Unable to load NGO applications");
    }
  }

  useEffect(() => {
    loadNgos();
  }, [user?.role]);

  async function updateNgoStatus(ngoId: number, verificationStatus: "verified" | "rejected") {
    setNgoActionError(null);
    try {
      await api(`/ngos/${ngoId}/verification?verification_status=${verificationStatus}`, { method: "PATCH" });
      await loadNgos();
    } catch (err) {
      setNgoActionError(err instanceof Error ? err.message : "Unable to update NGO application");
    }
  }

  async function handleNgoIntakeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (intakeAmount <= 0) return;

    setSubmittingIntake(true);
    setIntakeError(null);
    setIntakeSuccess(null);

    const activeCampaign = campaigns.find((c) => c.id === Number(selectedCampId)) || campaigns[0];
    const campId = activeCampaign ? activeCampaign.id : selectedCampId;

    try {
      const res = await api<any>(`/campaigns/${campId}/donations/record`, {
        method: "POST",
        body: JSON.stringify({
          campaign_id: campId,
          amount: intakeAmount,
          donor_name: donorName || undefined,
        }),
      });

      setIntakeSuccess({
        receipt_token: res.receipt_token,
        amount: Number(res.amount || intakeAmount),
        campaign_title: activeCampaign?.title || `Campaign #${campId}`,
        donor_name: donorName || undefined,
        hedera_sequence_number: res.hedera_sequence_number,
        hedera_transaction_id: res.hedera_transaction_id,
      });

      // Reset form
      setDonorName("");
      setIntakeAmount(100);

      if (onDonationRecorded) {
        onDonationRecorded();
      }
    } catch (err) {
      setIntakeError(err instanceof Error ? err.message : "Failed to record donation");
    } finally {
      setSubmittingIntake(false);
    }
  }

  if (user?.role === "platform_admin") {
    return (
      <div className="profile-page-layout">
        <div className="profile-top-header">
          <div>
            <span className="eyebrow">MODERATOR</span>
            <h1 className="page-heading-title">NGO Admin Applications</h1>
          </div>
          <button type="button" className="secondary" onClick={loadNgos}>
            Refresh
          </button>
        </div>

        <div className="profile-section-card" style={{ border: "2px solid #d97706" }}>
          <p className="setting-description-text">
            Review NGO administrator applications and approve or reject access to the Amanah platform.
          </p>
          {ngoActionError && <div className="alert error">{ngoActionError}</div>}
          {pendingNgos.length === 0 ? (
            <p className="setting-description-text" style={{ marginTop: "1rem" }}>
              No NGO administrator applications found.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "0.8rem" }}>NGO</th>
                    <th style={{ padding: "0.8rem" }}>Admin email</th>
                    <th style={{ padding: "0.8rem" }}>Phone</th>
                    <th style={{ padding: "0.8rem" }}>Registration document</th>
                    <th style={{ padding: "0.8rem" }}>Status</th>
                    <th style={{ padding: "0.8rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingNgos.map((ngo) => (
                    <tr key={ngo.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "0.8rem", fontWeight: 700 }}>{ngo.name}</td>
                      <td style={{ padding: "0.8rem", color: "#475569" }}>{ngo.email}</td>
                      <td style={{ padding: "0.8rem", color: "#475569" }}>{ngo.phone_number || "—"}</td>
                      <td style={{ padding: "0.8rem" }}>
                        {ngo.registration_document ? (
                          <a href={ngo.registration_document} target="_blank" rel="noreferrer">
                            View document
                          </a>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "0.8rem" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.25rem 0.55rem",
                          borderRadius: "999px",
                          background: ngo.verification_status === "verified" ? "#dcfce7" : ngo.verification_status === "rejected" ? "#fee2e2" : "#fef3c7",
                          color: ngo.verification_status === "verified" ? "#166534" : ngo.verification_status === "rejected" ? "#991b1b" : "#92400e",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}>
                          {ngo.verification_status}
                        </span>
                      </td>
                      <td style={{ padding: "0.8rem" }}>
                        {ngo.verification_status === "pending" ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="button" className="primary" onClick={() => updateNgoStatus(ngo.id, "verified")}>Accept</button>
                            <button type="button" className="secondary" onClick={() => updateNgoStatus(ngo.id, "rejected")}>Reject</button>
                          </div>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-layout">
      <div className="profile-top-header">
        <h1 className="page-heading-title">
          {user?.role === "ngo_admin" ? "NGO Admin Dashboard" : "Profile"}
        </h1>
      </div>
      {dashboardError && user?.role === "ngo_admin" && ngoStatus?.verification_status === "pending" && (
        <div className="ngo-pending-banner">
          <div className="ngo-pending-icon">⏳</div>
          <div>
            <strong>Application under review</strong>
            <p>Your NGO application is pending moderator approval. Dashboard tools will unlock once your organization is verified.</p>
          </div>
        </div>
      )}
      {dashboardError && user?.role === "ngo_admin" && !ngoStatus && (
        <div className="alert error" style={{ marginBottom: "1rem" }}>
          {dashboardError}
        </div>
      )}

      <div className="profile-split-container">
        {/* Left Column — User Info */}
        <div className="profile-left-column">
          {/* User Card */}
          <div className="profile-avatar-card">
            <div className="avatar-img-wrap">
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="profile-avatar-img"
              />
            </div>
            <h2 className="avatar-user-name">{profile.name}</h2>
            <span className="avatar-sub-role">{profile.email}</span>
            {user?.role === "ngo_admin" && ngoStatus && (
              <span style={{ marginTop: "0.5rem", color: ngoStatus.verification_status === "verified" ? "#047857" : "#b45309", fontWeight: 700, fontSize: "0.8rem" }}>
                {ngoStatus.verification_status === "verified" ? "Verified NGO" : `Application ${ngoStatus.verification_status}`}
              </span>
            )}
          </div>

          {/* Personal Info */}
          <div className="profile-section-card">
            <h3>Account Info</h3>
            <div className="info-fields-grid">
              <div className="info-row">
                <span className="info-label">Name</span>
                <span className="info-val">{profile.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-val">{profile.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className={`info-val ${ngoStatus?.verification_status === "verified" ? "text-green" : ""}`}>
                  {ngoStatus?.verification_status === "verified" ? "Verified ✓" : ngoStatus?.verification_status || "Pending"}
                </span>
              </div>
              {ngoStatus?.phone_number && (
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-val">{ngoStatus.phone_number}</span>
                </div>
              )}
              {ngoStatus?.registration_document && (
                <div className="info-row">
                  <span className="info-label">Registration</span>
                  <a className="info-val" href={ngoStatus.registration_document} target="_blank" rel="noreferrer">View document</a>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column — NGO Admin Desk */}
        <div className="profile-right-column">
          {/* NGO AID INTAKE DESK */}
          {user?.role === "ngo_admin" && ngoStatus?.verification_status === "verified" && (
          <div className="profile-section-card ngo-admin-card" style={{ border: "2px solid #059669", background: "linear-gradient(180deg, rgba(5, 150, 105, 0.04) 0%, transparent 100%)" }}>
            <div className="card-header-with-action">
              <div>
                <span className="eyebrow" style={{ color: "#059669", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                  NGO ADMIN
                </span>
                <h3 style={{ marginTop: "0.25rem" }}>Record Donation & Issue Receipt</h3>
              </div>
            </div>

            <p className="setting-description-text" style={{ marginTop: "0.5rem" }}>
              After a donor contributes (cash, wire, or through the external platform), record it here.
              The donation will be anchored to <strong>Hedera HCS</strong> and a receipt code will be generated
              for the donor to verify.
            </p>

            {user.ngo_id && <button type="button" className="primary" onClick={() => setShowCreateCampaign(true)} style={{ marginTop: "0.75rem" }}>＋ Create Campaign</button>}
            <form onSubmit={handleNgoIntakeSubmit} style={{ marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="input-group">
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Campaign</label>
                  <select
                    value={selectedCampId}
                    onChange={(e) => setSelectedCampId(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  >
                    {campaigns.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Amount ($ USD)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={intakeAmount}
                    onChange={(e) => setIntakeAmount(Number(e.target.value))}
                    required
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginTop: "0.75rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Donor Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed, Anonymous"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
              </div>

              {intakeError && <div className="alert error" style={{ marginTop: "0.75rem" }}>{intakeError}</div>}

              <button
                type="submit"
                className="btn-confirm-donation-solid"
                disabled={submittingIntake}
                style={{ marginTop: "1rem", width: "100%", background: "#059669", color: "#fff", padding: "0.85rem", borderRadius: "8px", border: "none", fontWeight: 600, cursor: "pointer" }}
              >
                {submittingIntake ? "Anchoring to Hedera..." : `Record $${intakeAmount} & Generate Receipt`}
              </button>
            </form>

            {/* Generated Receipt */}
            {intakeSuccess && (
              <div className="receipt-certificate" style={{ marginTop: "1.25rem", border: "2px solid #059669", background: "#f0fdf4", padding: "1.25rem", borderRadius: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #bbf7d0", paddingBottom: "0.75rem" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#065f46" }}>Receipt Generated ✓</h4>
                    <span style={{ fontSize: "0.8rem", color: "#047857" }}>Anchored to Hedera Consensus Service</span>
                  </div>
                </div>

                <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4b5563", fontSize: "0.88rem" }}>Receipt Code:</span>
                    <strong style={{ fontFamily: "monospace", fontSize: "1.05rem", color: "#065f46" }}>{intakeSuccess.receipt_token}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4b5563", fontSize: "0.88rem" }}>Amount:</span>
                    <strong style={{ color: "#111827" }}>${intakeSuccess.amount.toFixed(2)} USD</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4b5563", fontSize: "0.88rem" }}>Campaign:</span>
                    <span style={{ color: "#111827" }}>{intakeSuccess.campaign_title}</span>
                  </div>
                  {intakeSuccess.donor_name && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#4b5563", fontSize: "0.88rem" }}>Donor:</span>
                      <span style={{ color: "#111827" }}>{intakeSuccess.donor_name}</span>
                    </div>
                  )}
                  {intakeSuccess.hedera_sequence_number && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#4b5563", fontSize: "0.88rem" }}>Hedera Sequence #:</span>
                      <strong style={{ color: "#059669" }}>#{intakeSuccess.hedera_sequence_number}</strong>
                    </div>
                  )}
                  {intakeSuccess.hedera_transaction_id && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#4b5563", fontSize: "0.88rem" }}>Transaction ID:</span>
                      <span style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{intakeSuccess.hedera_transaction_id}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(intakeSuccess.receipt_token);
                      alert("Receipt code copied! Give this code to the donor.");
                    }}
                    style={{ flex: 1, padding: "0.6rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
                  >
                    📋 Copy Code
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Campaigns List */}
          {user?.role !== "ngo_admin" || ngoStatus?.verification_status === "verified" ? <div className="profile-section-card">
            <h3>Campaigns</h3>
            <div className="supported-campaigns-list">
              {campaigns.slice(0, 5).map((camp) => (
                <div key={camp.id} className="supported-campaign-row" onClick={() => onOpenCampaign(camp.id)}>
                  <img
                    src={camp.image_url}
                    alt={camp.title}
                    className="supported-thumb"
                  />
                  <div className="supported-info-col">
                    <div className="supported-title-line">
                      <strong>{camp.title}</strong>
                      {camp.urgency && <span className="urgency-pill high">{camp.urgency}</span>}
                    </div>
                    <p className="supported-summary">{camp.description?.slice(0, 80)}...</p>
                  </div>
                  <span className="chevron-arrow">›</span>
                </div>
              ))}
            </div>
          </div> : null}
        </div>
      </div>
      {showCreateCampaign && user?.ngo_id && (
        <CreateCampaignModal
          ngoId={user.ngo_id}
          onClose={() => setShowCreateCampaign(false)}
          onCreated={() => {
            setShowCreateCampaign(false);
            onDonationRecorded?.();
          }}
        />
      )}
    </div>
  );
};
