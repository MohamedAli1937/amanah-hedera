import React, { useEffect, useState } from "react";
import type { UserProfile, Campaign, NGO, User, NGOStatus } from "../types";
import { api } from "../api";
import { CreateCampaignModal } from "./CreateCampaignModal";
import { EditCampaignModal } from "./EditCampaignModal";
import { EventModerationPanel } from "./EventModerationPanel";
import { IssuedReceiptCard } from "./IssuedReceiptCard";
import { NgoActivityPanel } from "./NgoActivityPanel";
import { getRealFallbackImage } from "../utils/geoData";

interface Props {
  profile: UserProfile;
  user: User | null;
  campaigns?: Campaign[];
  dashboardError?: string | null;
  ngoStatus?: NGOStatus | null;
  onBack?: () => void;
  onOpenCampaign: (campaignId: number) => void;
  onDonationRecorded?: () => void;
}

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export const ProfilePage: React.FC<Props> = ({
  profile,
  user,
  campaigns = [],
  dashboardError = null,
  ngoStatus = null,
  onBack,
  onOpenCampaign,
  onDonationRecorded,
}) => {
  const [selectedCampId, setSelectedCampId] = useState<number>(
    campaigns.length > 0 ? campaigns[0].id : 0
  );
  const [intakeAmount, setIntakeAmount] = useState<number>(100);
  const [donorName, setDonorName] = useState<string>("");
  const [submittingIntake, setSubmittingIntake] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
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
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showReceiptCard, setShowReceiptCard] = useState(false);

  // Editable Profile State
  const [customName, setCustomName] = useState(
    profile.name || "Amanah Demo Org"
  );
  const [customBio, setCustomBio] = useState(
    "A registered non-profit delivering emergency food aid to families in Tunis. Every donation is recorded on the ledger so donors can trace it from receipt to distribution."
  );
  const [customPhone, setCustomPhone] = useState("+216 20 000 000");
  const [customLocation, setCustomLocation] = useState("Tunis, Tunisia");

  const [pendingNgos, setPendingNgos] = useState<NGO[]>([]);
  const [ngoActionError, setNgoActionError] = useState<string | null>(null);

  useEffect(() => {
    if (
      campaigns.length > 0 &&
      !campaigns.some((c) => c.id === selectedCampId)
    ) {
      setSelectedCampId(campaigns[0].id);
    }
  }, [campaigns, selectedCampId]);

  async function loadNgos() {
    if (user?.role !== "platform_admin") return;
    try {
      setPendingNgos(await api<NGO[]>("/ngos/"));
    } catch (err) {
      setNgoActionError(
        err instanceof Error ? err.message : "Unable to load NGO applications"
      );
    }
  }

  useEffect(() => {
    loadNgos();
  }, [user?.role]);

  async function updateNgoStatus(
    ngoId: number,
    verificationStatus: "verified" | "rejected"
  ) {
    setNgoActionError(null);
    try {
      await api(
        `/ngos/${ngoId}/verification?verification_status=${verificationStatus}`,
        { method: "PATCH" }
      );
      await loadNgos();
    } catch (err) {
      setNgoActionError(
        err instanceof Error
          ? err.message
          : "Unable to update NGO application"
      );
    }
  }

  async function handleNgoIntakeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (intakeAmount <= 0) return;

    setSubmittingIntake(true);
    setIntakeError(null);
    setIntakeSuccess(null);

    const activeCampaign =
      campaigns.find((c) => c.id === Number(selectedCampId)) || campaigns[0];
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

      setDonorName("");
      setIntakeAmount(100);
      setShowReceiptCard(true);

      if (onDonationRecorded) {
        onDonationRecorded();
      }
    } catch (err) {
      setIntakeError(
        err instanceof Error ? err.message : "Failed to record donation"
      );
    } finally {
      setSubmittingIntake(false);
    }
  }

  // ==========================================================================
  // MODERATOR VIEW
  // ==========================================================================
  if (user?.role === "platform_admin") {
    const pendingCount = pendingNgos.filter(
      (n) => n.verification_status === "pending"
    ).length;

    return (
      <div className="wrap profile-page-wrap">
        <div className="profile-topbar">
          <div className="profile-topbar-left">
            {onBack && (
              <button
                type="button"
                className="btn sec profile-back-btn"
                onClick={onBack}
                aria-label="Back to map"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back to Map</span>
              </button>
            )}
          </div>

          <div className="profile-topbar-actions">
            {pendingCount > 0 && (
              <span className="pill am">{pendingCount} Pending Review</span>
            )}
            <button
              type="button"
              className="btn sec profile-action-btn"
              onClick={loadNgos}
            >
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
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
              <span>Refresh List</span>
            </button>
          </div>
        </div>

        {ngoActionError && (
          <div className="auth-alert error">{ngoActionError}</div>
        )}

        <div className="card mod-table-card">
          <div className="mod-table-scroll">
            <div className="trow mod-table-head">
              <span>ORGANIZATION</span>
              <span>ADMIN EMAIL</span>
              <span>PHONE</span>
              <span>STATUS</span>
              <span>ACTION</span>
            </div>

            {pendingNgos.length === 0 ? (
              <div className="profile-empty-state">
                No NGO administrator applications found.
              </div>
            ) : (
              pendingNgos.map((ngo) => (
                <div key={ngo.id} className="trow mod-table-row">
                  <strong className="mod-org-name">{ngo.name}</strong>
                  <span className="mod-cell-muted">{ngo.email}</span>
                  <span className="mod-cell-muted mono">
                    {ngo.phone_number || "—"}
                  </span>
                  <span>
                    <span
                      className={
                        ngo.verification_status === "verified"
                          ? "pill"
                          : ngo.verification_status === "rejected"
                          ? "pill crit"
                          : "pill am"
                      }
                    >
                      {ngo.verification_status.toUpperCase()}
                    </span>
                  </span>
                  <div>
                    {ngo.verification_status === "pending" ? (
                      <div className="mod-action-group">
                        <button
                          type="button"
                          className="btn mod-btn-approve"
                          onClick={() => updateNgoStatus(ngo.id, "verified")}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          className="btn sec mod-btn-reject"
                          onClick={() => updateNgoStatus(ngo.id, "rejected")}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="mod-reviewed-label">Reviewed</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <EventModerationPanel />
      </div>
    );
  }

  // ==========================================================================
  // NGO ADMIN / USER PROFILE VIEW
  // ==========================================================================
  const orgEmail = profile.email || user?.email || "contact@espoir.example";
  const isVerified = ngoStatus
    ? ngoStatus.verification_status === "verified"
    : true;
  const totalCollected = campaigns.reduce(
    (sum, c) => sum + Number(c.collected_amount || 0),
    0
  );

  return (
    <div className="wrap profile-page-wrap">
      {onBack && (
        <div className="profile-back-bar">
          <button
            type="button"
            className="btn sec profile-back-btn"
            onClick={onBack}
            aria-label="Back to campaigns map"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to Map</span>
          </button>
        </div>
      )}

      {/* 1. Top Grid: Account Profile Box (#06402f) + Issue Receipt Box */}
      <div className="profile-top-grid">
        {/* Left Box: #06402f Account Profile Card */}
        <div className="card profile-hero-card">
          <div>
            <div className="profile-hero-head">
              <div className="profile-avatar">
                {customName.charAt(0).toUpperCase()}
              </div>

              <div className="profile-identity">
                <div className="profile-name-bar">
                  <div className="profile-name-row">
                    <h1 className="profile-org-name">{customName}</h1>
                    {isVerified && (
                      <span
                        className="profile-verified-badge"
                        title="Verified NGO on Hedera HCS"
                        aria-label="Verified NGO"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Icon buttons positioned right of the name */}
                  <div className="profile-name-actions">
                    <button
                      type="button"
                      className="profile-icon-btn"
                      aria-label="Registration document"
                      title="Registration Doc"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 3h8l4 4v14H7zM14 3v5h5" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="profile-icon-btn is-amber"
                      aria-label="Edit profile"
                      title="Edit Profile"
                      onClick={() => setShowEditProfile(true)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 20h4L19 9l-4-4L4 16z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <span className="profile-role-chip">NGO ADMINISTRATOR</span>
              </div>
            </div>

            {/* Boxed NGO Description */}
            <div className="profile-bio-box">
              <p className="profile-bio">{customBio}</p>
            </div>
          </div>

          <div className="profile-hero-footer">
            {/* 2-Column Stats Strip */}
            <div className="profile-stats-strip">
              <div className="profile-stat-cell">
                <span className="profile-stat-label">Active Campaigns</span>
                <span className="profile-stat-value mono">
                  {campaigns.length}
                </span>
              </div>
              <div className="profile-stat-cell">
                <span className="profile-stat-label">Total Verified Aid</span>
                <span className="profile-stat-value mono">
                  ${totalCollected.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Contact Pills */}
            <div className="profile-meta-chips">
              <span className="profile-chip">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
                <span>{orgEmail}</span>
              </span>

              <span className="profile-chip">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span className="mono">{customPhone}</span>
              </span>

              <span className="profile-chip">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z" />
                  <circle cx="12" cy="11" r="2.2" />
                </svg>
                <span>{customLocation}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Box: Issue Receipt & Record Donation Panel */}
        <div className="card profile-intake-card">
          <div>
            <div className="profile-intake-header">
              <div>
                <span className="eyebrow">Ledger Intake</span>
                <h2 className="profile-section-title">
                  Issue Receipt & Record Donation
                </h2>
              </div>
              <span className="pill">HEDERA HCS</span>
            </div>

            {intakeSuccess && !showReceiptCard && (
              <button
                type="button"
                onClick={() => setShowReceiptCard(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid rgba(6,64,47,0.14)",
                  background: "rgba(6,64,47,0.06)",
                  cursor: "pointer",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                <span className="proof-status-dot" aria-hidden="true" />
                <span className="mono" style={{ flex: 1, textAlign: "left", fontSize: 12, color: "#06402F", wordBreak: "break-all" }}>
                  {intakeSuccess.receipt_token}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#0F6B4F", flex: "none" }}>
                  View receipt & QR ↗
                </span>
              </button>
            )}

            {intakeError && (
              <div className="auth-alert error">{intakeError}</div>
            )}

            <form
              onSubmit={handleNgoIntakeSubmit}
              className="profile-intake-form"
            >
              <div className="profile-intake-row">
                <div>
                  <label>Select Campaign</label>
                  <select
                    value={selectedCampId}
                    onChange={(e) => setSelectedCampId(Number(e.target.value))}
                    aria-label="Campaign"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Donor Name (Optional)</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="e.g. Anonymous"
                    aria-label="Donor name"
                  />
                </div>
              </div>

              {/* Amount Input + $25 $50 $100 $250 $500 Inline on ONE single row */}
              <div>
                <label>Amount (USD)</label>
                <div className="profile-amount-line">
                  <input
                    type="number"
                    min="1"
                    className="mono profile-amount-input"
                    value={intakeAmount}
                    onChange={(e) => setIntakeAmount(Number(e.target.value))}
                    placeholder="100"
                    aria-label="Amount in USD"
                  />

                  <div
                    className="profile-presets"
                    role="group"
                    aria-label="Preset amounts"
                  >
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`profile-preset-chip mono ${
                          intakeAmount === amt ? "is-active" : ""
                        }`}
                        onClick={() => setIntakeAmount(amt)}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingIntake || campaigns.length === 0}
                className="btn am profile-issue-btn"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />
                </svg>
                <span>
                  {submittingIntake ? "Anchoring on Hedera..." : "Issue Receipt"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Review Pending Warning */}
      {dashboardError &&
        user?.role === "ngo_admin" &&
        ngoStatus?.verification_status === "pending" && (
          <div className="profile-pending-notice">
            Your NGO application is pending moderator review. Campaign creation
            and donation intake will fully unlock once verified.
          </div>
        )}

      {/* 2. My Campaigns Section */}
      <div className="card profile-campaigns-panel">
        <div className="profile-campaigns-header">
          <div>
            <h2 className="profile-section-title">My Campaigns</h2>
          </div>

          <button
            type="button"
            className="btn am profile-create-btn"
            onClick={() => setShowCreateCampaign(true)}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Create Campaign</span>
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="profile-empty-state">
            No campaigns created yet. Click <strong>Create Campaign</strong> to
            launch your first relief drive.
          </div>
        ) : (
          <div className="profile-campaigns-grid">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="profile-campaign-item"
                onClick={() => onOpenCampaign(camp.id)}
              >
                <img
                  src={
                    camp.image_url ||
                    getRealFallbackImage(camp.urgency, camp.title)
                  }
                  alt={camp.title}
                  className="profile-campaign-thumb"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getRealFallbackImage(
                      camp.urgency,
                      camp.title
                    );
                  }}
                />

                <div className="profile-campaign-info">
                  <strong className="profile-campaign-title">
                    {camp.title}
                  </strong>
                  <span className="profile-campaign-loc">
                    {camp.location_name || "Relief Zone"}
                  </span>

                  <div className="profile-campaign-meta">
                    <span
                      className={
                        camp.urgency === "critical"
                          ? "pill crit"
                          : camp.urgency === "high"
                          ? "pill am"
                          : "pill"
                      }
                    >
                      {(camp.urgency || "HIGH").toUpperCase()}
                    </span>

                    <span className="profile-campaign-amount mono">
                      ${Number(camp.collected_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn sec profile-campaign-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCampaign(camp);
                  }}
                  title="Edit campaign details"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <NgoActivityPanel campaigns={campaigns} />

      {/* Interactive Edit Profile Modal */}
      {showEditProfile && (
        <div
          className="modal-backdrop-frosted"
          onClick={() => setShowEditProfile(false)}
        >
          <div
            className="modal-card-frosted auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-modal-top">
              <div>
                <span className="eyebrow">Organization Details</span>
                <h2 className="auth-modal-title">Edit Profile</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowEditProfile(false)}
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowEditProfile(false);
              }}
              className="modal-form"
            >
              <div>
                <label>Organization / User Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Mission / Description</label>
                <textarea
                  rows={3}
                  value={customBio}
                  onChange={(e) => setCustomBio(e.target.value)}
                  required
                />
              </div>

              <div className="profile-edit-row">
                <div>
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label>Location</label>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn sec"
                  style={{ flex: 1 }}
                  onClick={() => setShowEditProfile(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn am" style={{ flex: 1 }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <CreateCampaignModal
          ngoId={
            ngoStatus?.ngo_id ||
            (user?.role === "ngo_admin" ? user.ngo_id || 1 : 1)
          }
          onClose={() => setShowCreateCampaign(false)}
          onSuccess={async () => {
            setShowCreateCampaign(false);
            if (onDonationRecorded) await onDonationRecorded();
          }}
          onCreated={async () => {
            setShowCreateCampaign(false);
            if (onDonationRecorded) await onDonationRecorded();
          }}
        />
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onUpdated={async () => {
            setEditingCampaign(null);
            if (onDonationRecorded) onDonationRecorded();
          }}
        />
      )}

      {showReceiptCard && intakeSuccess && (
        <IssuedReceiptCard
          receipt={{
            receipt_token: intakeSuccess.receipt_token,
            amount: intakeSuccess.amount,
            campaign_title: intakeSuccess.campaign_title,
            donor_name: intakeSuccess.donor_name,
            hedera_sequence_number: intakeSuccess.hedera_sequence_number,
            hedera_transaction_id: intakeSuccess.hedera_transaction_id,
          }}
          onClose={() => setShowReceiptCard(false)}
        />
      )}
    </div>
  );
};