import React, { useState, useMemo } from "react";
import type { Campaign } from "../types";
import { api } from "../api";
import { PRESET_CAMPAIGN_IMAGES } from "../utils/geoData";
import { Country, City } from "country-state-city";

interface Props {
  campaign: Campaign;
  onClose: () => void;
  onUpdated: (updated: Campaign) => void;
}

export const EditCampaignModal: React.FC<Props> = ({
  campaign,
  onClose,
  onUpdated,
}) => {
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [goal, setGoal] = useState<number | string>(campaign.goal);
  const [status, setStatus] = useState<Campaign["status"]>(campaign.status);
  const [donationLink, setDonationLink] = useState(
    campaign.donation_link || ""
  );
  const [urgency, setUrgency] = useState<"critical" | "high" | "medium">(
    campaign.urgency || "high"
  );

  // Determine initial country ISO code from location_name
  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const guessInitialCountryCode = () => {
    const loc = campaign.location_name || "";
    const found = allCountries.find((c) => loc.includes(c.name));
    return found?.isoCode || "PS";
  };

  const [selectedCountryCode, setSelectedCountryCode] = useState(
    guessInitialCountryCode
  );
  const citiesForCountry = useMemo(
    () => City.getCitiesOfCountry(selectedCountryCode) || [],
    [selectedCountryCode]
  );

  const guessInitialCity = (
    cities: ReturnType<typeof City.getCitiesOfCountry>
  ) => {
    const loc = campaign.location_name || "";
    const found = (cities || []).find((c) => loc.includes(c.name));
    return found?.name || (cities && cities.length > 0 ? cities[0].name : "");
  };

  const [selectedCityName, setSelectedCityName] = useState(() =>
    guessInitialCity(citiesForCountry)
  );

  // Image: file upload (base64) or URL preset
  const [imageUrl, setImageUrl] = useState(
    campaign.image_url || PRESET_CAMPAIGN_IMAGES[0].url
  );
  const [imageTab, setImageTab] = useState<"preset" | "url">("preset");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    setSelectedCountryCode(code);
    const cities = City.getCitiesOfCountry(code) || [];
    setSelectedCityName(cities.length > 0 ? cities[0].name : "");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadPreview(dataUrl);
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const selectedCountry = allCountries.find(
      (c) => c.isoCode === selectedCountryCode
    );
    const cityObj =
      citiesForCountry.find((c) => c.name === selectedCityName) ||
      citiesForCountry[0];
    const lat =
      cityObj && cityObj.latitude
        ? parseFloat(cityObj.latitude)
        : campaign.lat ?? 0;
    const lng =
      cityObj && cityObj.longitude
        ? parseFloat(cityObj.longitude)
        : campaign.lng ?? 0;
    const locationName = `${selectedCityName}, ${
      selectedCountry?.name || selectedCountryCode
    }`;
    const region =
      selectedCountry?.timezones?.[0]?.zoneName?.split("/")[0] || "World";

    const finalImage =
      imageTab === "url" && uploadPreview ? uploadPreview : imageUrl;

    try {
      const res = await api<Campaign>(`/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          goal: Number(goal),
          status,
          donation_link: donationLink.trim() || null,
          location_name: locationName,
          region,
          urgency,
          lat,
          lng,
          image_url: finalImage.trim() || campaign.image_url,
        }),
      });
      onUpdated(res);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update campaign"
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedCityObj = citiesForCountry.find(
    (c) => c.name === selectedCityName
  );

  return (
    <div className="modal-backdrop-frosted" onClick={onClose}>
      <div
        className="modal-card-frosted campaign-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="campaign-modal-header">
          <div className="campaign-title-group">
            <div className="campaign-badge-icon" aria-hidden="true">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20h4L19 9l-4-4L4 16z" />
              </svg>
            </div>
            <div>
              <span className="eyebrow">Campaign #{campaign.id}</span>
              <h2 className="campaign-modal-title">Edit Campaign Details</h2>
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
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <div className="auth-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Title */}
          <div>
            <label>Campaign Title</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label>Description & Mission</label>
            <textarea
              required
              rows={3}
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Goal, Urgency & Status Row */}
          <div className="campaign-three-col">
            <div>
              <label>Goal (USD)</label>
              <input
                type="number"
                min="1"
                required
                className="mono"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div>
              <label>Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) =>
                  setUrgency(e.target.value as "critical" | "high" | "medium")
                }
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </div>

            <div>
              <label>Campaign Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Campaign["status"])
                }
              >
                <option value="active">Active</option>
                <option value="goal_reached">Goal Reached</option>
                <option value="completed">Completed</option>
                <option value="suspended">Suspended</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Location Picker Box */}
          <div className="campaign-location-box">
            <div className="campaign-location-top">
              <div className="campaign-location-label">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
                </svg>
                <span>Campaign Location & Map Placement</span>
              </div>

              {selectedCityObj && (
                <span className="campaign-coords-pill mono">
                  {parseFloat(selectedCityObj.latitude || "0").toFixed(3)},{" "}
                  {parseFloat(selectedCityObj.longitude || "0").toFixed(3)}
                </span>
              )}
            </div>

            <div className="campaign-two-col">
              <div>
                <label>Country</label>
                <select
                  value={selectedCountryCode}
                  onChange={handleCountryChange}
                >
                  {allCountries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>City / Zone</label>
                <select
                  value={selectedCityName}
                  onChange={(e) => setSelectedCityName(e.target.value)}
                >
                  {citiesForCountry.length === 0 ? (
                    <option value="">No cities available</option>
                  ) : (
                    citiesForCountry.map((city) => (
                      <option
                        key={city.name + city.latitude}
                        value={city.name}
                      >
                        {city.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Campaign Photo Switcher */}
          <div>
            <div className="campaign-photo-head">
              <label style={{ marginBottom: 0 }}>Campaign Photo</label>
              <div
                className="campaign-seg"
                role="tablist"
                aria-label="Photo source"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={imageTab === "preset"}
                  className={`campaign-seg-btn ${
                    imageTab === "preset" ? "is-active" : ""
                  }`}
                  onClick={() => setImageTab("preset")}
                >
                  Choose Preset
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={imageTab === "url"}
                  className={`campaign-seg-btn ${
                    imageTab === "url" ? "is-active" : ""
                  }`}
                  onClick={() => setImageTab("url")}
                >
                  Upload Photo
                </button>
              </div>
            </div>

            {imageTab === "preset" ? (
              <div className="campaign-preset-panel">
                <div className="campaign-preset-grid">
                  {PRESET_CAMPAIGN_IMAGES.map((preset) => {
                    const isSelected =
                      imageUrl === preset.url && !uploadPreview;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={`campaign-preset-card ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          setImageUrl(preset.url);
                          setUploadPreview(null);
                        }}
                      >
                        <img src={preset.url} alt={preset.label} />
                        <span className="campaign-preset-caption">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <input
                  type="url"
                  placeholder="Or paste a custom image URL..."
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setUploadPreview(null);
                  }}
                />
              </div>
            ) : (
              <div className="campaign-upload-well">
                {uploadPreview ? (
                  <div className="campaign-upload-preview">
                    <img src={uploadPreview} alt="Upload preview" />
                    <button
                      type="button"
                      className="btn sec campaign-remove-btn"
                      onClick={() => setUploadPreview(null)}
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <label className="campaign-upload-dropzone">
                    <div className="campaign-upload-icon" aria-hidden="true">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span className="campaign-upload-title">
                      Click to upload campaign photo
                    </span>
                    <span className="campaign-upload-sub">
                      JPG, PNG, or WEBP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Public NGO Donation Link */}
          <div>
            <label>Public NGO Donation Link (Optional)</label>
            <input
              type="url"
              placeholder="https://give.unrefugees.org/donate"
              value={donationLink}
              onChange={(e) => setDonationLink(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="campaign-modal-footer">
            <button type="button" className="btn sec" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn am">
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};