import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Campaign } from "../types";

interface Props {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  onSelectCampaign: (campaign: Campaign) => void;
  selectedRegion: string;
  onChangeRegion: (region: string) => void;
  selectedUrgency: string;
  onChangeUrgency: (urgency: string) => void;
}

export const InteractiveMap: React.FC<Props> = ({
  campaigns,
  selectedCampaign,
  onSelectCampaign,
  selectedRegion,
  onChangeRegion,
  selectedUrgency,
  onChangeUrgency,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create Leaflet map instance centered on Middle East / North Africa
      const map = L.map(mapContainerRef.current, {
        center: [23.5, 30.0],
        zoom: 4,
        minZoom: 3,
        maxZoom: 9,
        zoomControl: false, // Custom positioned zoom control
      });

      // Free OpenStreetMap tile server (100% free, no API key needed)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom control at bottom right
      L.control
        .zoom({
          position: "bottomright",
        })
        .addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers whenever campaigns or selectedCampaign changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    campaigns.forEach((camp) => {
      const lat = camp.lat ?? 31.45;
      const lng = camp.lng ?? 34.38;
      const isSelected = selectedCampaign?.id === camp.id;

      const pinColor =
        camp.urgency === "critical"
          ? "#dc2626"
          : camp.urgency === "high"
          ? "#059669"
          : "#0284c7";

      // HTML custom pin matching the user demo mockup label
      const iconHtml = `
        <div class="leaflet-custom-marker ${isSelected ? "is-selected" : ""}">
          <div class="marker-core-dot" style="background-color: ${pinColor}; box-shadow: 0 0 0 4px ${pinColor}33;"></div>
          <div class="marker-pill-label" style="border-color: ${isSelected ? pinColor : "#e2e8f0"}">
            <span class="pill-dot" style="background-color: ${pinColor}"></span>
            <span class="pill-title">${camp.title}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "leaflet-marker-wrapper",
        html: iconHtml,
        iconSize: [160, 36],
        iconAnchor: [12, 18],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup content
      const percent = Math.min(
        100,
        Math.round(((camp.collected_amount || 0) / (camp.goal || 1)) * 100)
      );

      const popupHtml = `
        <div class="leaflet-popup-card">
          <div class="popup-tag ${camp.urgency || "high"}">${(camp.urgency || "High").toUpperCase()} URGENCY</div>
          <h4>${camp.title}</h4>
          <p>${camp.location_name || "Relief Zone"}</p>
          <div class="popup-prog">
            <div class="popup-prog-fill" style="width: ${percent}%;"></div>
          </div>
          <div class="popup-meta">
            <span><strong>${percent}%</strong> Funded</span>
            <span>$${((camp.collected_amount || 0) / 1000).toFixed(0)}k / $${((camp.goal || 1) / 1000).toFixed(0)}k</span>
          </div>
          <button class="popup-open-btn" id="popup-btn-${camp.id}">View Campaign Details →</button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: "custom-leaflet-popup",
      });

      marker.on("click", () => {
        onSelectCampaign(camp);
      });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`popup-btn-${camp.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectCampaign(camp);
          };
        }
      });

      marker.addTo(markersLayer);
    });

    // If a campaign is selected, smoothly pan to it
    if (selectedCampaign && selectedCampaign.lat && selectedCampaign.lng) {
      map.panTo([selectedCampaign.lat, selectedCampaign.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [campaigns, selectedCampaign, onSelectCampaign]);

  return (
    <div className="interactive-map-wrapper">
      {/* Floating Filter Overlay in top-right matching user demo layout */}
      <div className="map-filters-overlay">
        <div className="filter-header">
          <svg
            className="icon-xs"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filters</span>
        </div>
        <div className="filter-control-item">
          <label>Region</label>
          <select
            value={selectedRegion}
            onChange={(e) => onChangeRegion(e.target.value)}
          >
            <option value="all">All regions</option>
            <option value="Middle East">Middle East</option>
            <option value="North Africa">North Africa</option>
            <option value="East Africa">East Africa</option>
          </select>
        </div>
        <div className="filter-control-item">
          <label>Urgency</label>
          <select
            value={selectedUrgency}
            onChange={(e) => onChangeUrgency(e.target.value)}
          >
            <option value="all">All urgencies</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
        </div>
      </div>

      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="real-leaflet-map-div" />
    </div>
  );
};
