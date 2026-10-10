import React, { useState, useMemo } from "react";
import type { Campaign } from "../types";
import { InteractiveMap } from "./InteractiveMap";

interface Props {
  campaigns: Campaign[];
  onOpenCampaign: (campaign: Campaign) => void;
  onDonateClick: (campaign: Campaign) => void;
}

export const CampaignsPage: React.FC<Props> = ({
  campaigns,
  onOpenCampaign,
  onDonateClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedUrgency, setSelectedUrgency] = useState("all");
  const [highlightedCampaign, setHighlightedCampaign] = useState<Campaign | null>(null);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      // Region filter
      if (selectedRegion !== "all" && camp.region !== selectedRegion) {
        return false;
      }
      // Urgency filter
      if (selectedUrgency !== "all" && camp.urgency !== selectedUrgency) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = camp.title.toLowerCase().includes(q);
        const matchesDesc = (camp.description || "").toLowerCase().includes(q);
        const matchesLoc = (camp.location_name || "").toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesLoc;
      }
      return true;
    });
  }, [campaigns, selectedRegion, selectedUrgency, searchQuery]);

  return (
    <div className="campaigns-edge-to-edge-layout">
      {/* 1. EDGE-TO-EDGE PROMINENT LEAFLET MAP AT THE TOP */}
      <section className="edge-to-edge-map-section">
        <InteractiveMap
          campaigns={filteredCampaigns}
          selectedCampaign={highlightedCampaign}
          onSelectCampaign={(camp) => {
            setHighlightedCampaign(camp);
            onOpenCampaign(camp);
          }}
          selectedRegion={selectedRegion}
          onChangeRegion={setSelectedRegion}
          selectedUrgency={selectedUrgency}
          onChangeUrgency={setSelectedUrgency}
        />
      </section>

      {/* 2. SECTION HEADER & SEARCH DIRECTLY UNDER THE MAP */}
      <div className="campaigns-controls-bar">
        <div className="controls-left">
          <h2 className="section-title-bold">Featured Humanitarian Campaigns</h2>
          <span className="campaigns-count-badge">
            {filteredCampaigns.length} Active On-Chain Projects
          </span>
        </div>

        <div className="controls-right">
          <div className="search-box-pill">
            <svg
              className="icon-search"
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
              placeholder="Search by title, location..."
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

      {/* 3. CAMPAIGN CARDS DIRECTLY UNDER THE MAP */}
      {filteredCampaigns.length === 0 ? (
        <div className="empty-results-box">
          <p>No campaigns match your search or region filters.</p>
          <button
            className="btn-link"
            onClick={() => {
              setSelectedRegion("all");
              setSelectedUrgency("all");
              setSearchQuery("");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="campaign-cards-grid-under-map">
          {filteredCampaigns.map((camp) => {
            const goal = Number(camp.goal) || 1;
            const collected = Number(camp.collected_amount) || 0;
            const percent = Math.min(100, Math.round((collected / goal) * 100));

            return (
              <article
                key={camp.id}
                className="campaign-card-full"
                onClick={() => onOpenCampaign(camp)}
              >
                {/* Photo Thumbnail */}
                <div className="card-media-wrap">
                  <img
                    src="/campaign-illustration.svg"
                    alt={camp.title}
                    className="card-media-img"
                    loading="lazy"
                  />
                  <div className="card-badge-row">
                    {camp.urgency && (
                      <span className={`urgency-pill ${camp.urgency}`}>
                        {camp.urgency.toUpperCase()}
                      </span>
                    )}
                    <span className="location-pill-subtle">
                      {camp.location_name || "Relief Zone"}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="card-body-content">
                  <h3 className="card-main-title">{camp.title}</h3>
                  <p className="card-desc-clamp">{camp.description}</p>

                  {/* Progress Row */}
                  <div className="card-progress-section">
                    <div className="progress-labels-row">
                      <strong className="text-percent">{percent}% Funded</strong>
                      <span className="text-funds">
                        ${collected.toLocaleString()} / ${goal.toLocaleString()}
                      </span>
                    </div>

                    <div className="progress-track-bar">
                      <div
                        className="progress-fill-emerald"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="donors-count-line">
                      <span>{camp.number_of_donors} Verified Donors</span>
                      <span className="dot-sep">•</span>
                      <span>Hedera HCS Audited</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="card-action-buttons">
                    <button
                      className="btn-card-details"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCampaign(camp);
                      }}
                    >
                      View Campaign →
                    </button>
                    <button
                      className="btn-card-donate-solid"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDonateClick(camp);
                      }}
                    >
                      Donate
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
