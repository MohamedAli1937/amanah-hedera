import React from "react";
import type { Campaign } from "../types";

interface Props {
  campaign: Campaign;
  onBack: () => void;
  onNavigateToLedger: (campaignTitle: string) => void;
}

export const CampaignDetailPage: React.FC<Props> = ({
  campaign,
  onBack,
  onNavigateToLedger,
}) => {
  const goal = Number(campaign.goal) || 1;
  const collected = Number(campaign.collected_amount) || 0;
  const percent = Math.min(100, Math.round((collected / goal) * 100));

  function handleExternalDonate() {
    // Lead to external donation page as specified
    const targetUrl =
      campaign.donation_link ||
      "https://give.unrefugees.org/donate";
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="campaign-detail-clean-layout">
      {/* Top Navigation */}
      <div className="detail-header-nav">
        <button className="btn-back-clean" onClick={onBack}>
          ← Back to All Campaigns
        </button>
        <span className="location-crumb">{campaign.location_name || "Relief Zone"}</span>
      </div>

      {/* Main Campaign Card: Image -> Description -> Bar -> Buttons */}
      <div className="campaign-main-card">
        {/* 1. IMAGE */}
        <div className="detail-media-container">
          <img
            src="/campaign-illustration.svg"
            alt={campaign.title}
            className="detail-hero-img"
          />
          {campaign.urgency && (
            <span className={`detail-urgency-badge ${campaign.urgency}`}>
              {campaign.urgency.toUpperCase()} URGENCY
            </span>
          )}
        </div>

        <div className="detail-content-body">
          {/* 2. DESCRIPTION */}
          <div className="detail-description-section">
            <h1 className="detail-title-large">{campaign.title}</h1>
            <p className="detail-desc-paragraph">{campaign.description}</p>
            <p className="detail-desc-note">
              Every financial disbursement and milestone event for this campaign is hashed using SHA-256
              and anchored into Hedera Consensus Service Topic <code>0.0.10972610</code>. Donors receive an
              unalterable digital receipt token proving their contribution reached the field.
            </p>
          </div>

          {/* 3. BAR (Progress Stats & Bar) */}
          <div className="detail-progress-box">
            <div className="progress-numbers-row">
              <span className="funded-highlight">{percent}% Funded</span>
              <span className="funds-ratio">
                <strong>${collected.toLocaleString()}</strong> raised of ${goal.toLocaleString()} goal
              </span>
            </div>

            <div className="detail-progress-track">
              <div
                className="detail-progress-fill-green"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="progress-audit-info">
              <span>{campaign.number_of_donors} Verified Donors</span>
              <span className="dot-sep">•</span>
              <span className="audit-tag-hcs">100% Cryptographically Audited on Hedera HCS</span>
            </div>
          </div>

          {/* 4. BUTTONS */}
          <div className="detail-two-primary-actions">
            <button
              className="btn-primary-donate-large"
              onClick={handleExternalDonate}
              title="Opens external donation gateway"
            >
              Donate to this Campaign ↗
            </button>

            <button
              className="btn-primary-ledger-history"
              onClick={() => onNavigateToLedger(campaign.title)}
            >
              View Related Hedera Ledger History →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
