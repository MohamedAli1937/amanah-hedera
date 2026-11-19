import React, { useState, useMemo, useRef, useEffect } from "react";
import type { Campaign, NGO } from "../types";
import { InteractiveMap, type MapHandle } from "./InteractiveMap";
import { CampaignActivityPanel } from "./CampaignActivityPanel";
import { getRealFallbackImage } from "../utils/geoData";
import { api } from "../api";

interface Props {
  campaigns: Campaign[];
  selectedCampaignId?: number | null;
  onNavigateToLedger: (campaignTitle: string) => void;
  onDonateClick?: (campaign: Campaign) => void;
}

type SidebarView =
  | { kind: "campaign-list" }
  | { kind: "ngo-list" }
  | { kind: "campaign-detail"; campaign: Campaign }
  | { kind: "ngo-detail"; ngo: NGO };

function UrgencyDot({ urgency, size = 12 }: { urgency?: string; size?: number }) {
  const level = urgency === "critical" || urgency === "high" ? urgency : "medium";
  return (
    <span
      className={`urgency-dot urgency-${level}`}
      role="img"
      aria-label={`Urgency: ${level}`}
      title={`Urgency: ${level}`}
      style={{ width: size, height: size }}
    />
  );
}

function DonateIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function VerifiedShield({ size = 16, color = "#0F6B4F", title = "Verified on Hedera" }: { size?: number; color?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      fillOpacity={0.16}
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      style={{ flex: "none" }}
    >
      <title>{title}</title>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ProgressRing({ percent, size = 44, stroke = 4 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const fontSize = size * 0.25;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${percent}% funded`} style={{ flex: "none" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(6,64,47,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#0F6B4F"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + fontSize * 0.36} textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize={fontSize} fill="#06402F">
        {percent}%
      </text>
    </svg>
  );
}

function formatMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
}

function getLeftInset(open: boolean, expanded = false) {
  if (!open || typeof window === "undefined" || window.innerWidth < 700) return 0;
  const width = expanded ? Math.min(980, window.innerWidth - 40) : 410;
  return width + 28;
}

const mapBtnStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  minHeight: "44px",
  padding: 0,
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  color: "#06402F",
  fontSize: "20px",
  fontWeight: 800,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  border: "1px solid rgba(255,255,255,0.8)",
};

function DonutProgress({ percent, size = 68 }: { percent: number; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${percent}% funded`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={size * 0.1} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#F59E0B"
        strokeWidth={size * 0.1}
        strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize={size * 0.22} fill="#fff">
        {percent}%
      </text>
    </svg>
  );
}

export const CampaignsPage: React.FC<Props> = ({
  campaigns,
  selectedCampaignId,
  onNavigateToLedger,
  onDonateClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeUrgencyFilter, setActiveUrgencyFilter] = useState<"all" | "critical" | "high">("all");
  const [selectedNgo, setSelectedNgo] = useState<string>("all");
  const [highlightedCampaign, setHighlightedCampaign] = useState<Campaign | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [view, setView] = useState<SidebarView>({ kind: "campaign-list" });
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"campaigns" | "ngos">("campaigns");
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [ngoQuery, setNgoQuery] = useState("");
  const mapRef = useRef<MapHandle>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    api<NGO[]>("/ngos/public").then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setNgos(data);
      }
    }).catch(() => {});
  }, []);

  const handledIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedCampaignId && handledIdRef.current !== selectedCampaignId) {
      const found = campaigns.find((c) => c.id === selectedCampaignId);
      if (found) {
        handledIdRef.current = selectedCampaignId;
        setHighlightedCampaign(found);
        setDetailExpanded(false);
        setView({ kind: "campaign-detail", campaign: found });
        setIsSidebarOpen(true);
        if (found.lat && found.lng) {
          mapRef.current?.panTo(found.lat, found.lng, getLeftInset(true, detailExpanded));
        }
      }
    }
  }, [selectedCampaignId, campaigns]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || !isSidebarOpen) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) {
        el.blur();
        return;
      }
      if (view.kind === "campaign-detail" || view.kind === "ngo-detail") {
        setView(activeTab === "ngos" ? { kind: "ngo-list" } : { kind: "campaign-list" });
      } else {
        setIsSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen, view, activeTab]);

  const uniqueNgos = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => {
      if (c.ngo_name) set.add(c.ngo_name);
    });
    return Array.from(set);
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      if (activeUrgencyFilter === "critical" && camp.urgency !== "critical") return false;
      if (activeUrgencyFilter === "high" && camp.urgency !== "high") return false;
      if (selectedNgo !== "all" && camp.ngo_name !== selectedNgo) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = camp.title.toLowerCase().includes(q);
        const matchesDesc = (camp.description || "").toLowerCase().includes(q);
        const matchesLoc = (camp.location_name || "").toLowerCase().includes(q);
        const matchesNgo = (camp.ngo_name || "").toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesLoc || matchesNgo;
      }
      return true;
    });
  }, [campaigns, activeUrgencyFilter, selectedNgo, searchQuery]);

  const filteredNgos = useMemo(() => {
    const q = ngoQuery.trim().toLowerCase();
    if (!q) return ngos;
    return ngos.filter((n) => n.name.toLowerCase().includes(q) || (n.email || "").toLowerCase().includes(q));
  }, [ngos, ngoQuery]);

  function openCampaignDetail(camp: Campaign) {
    setHighlightedCampaign(camp);
    setIsSidebarOpen(true); 
    if (camp.lat && camp.lng) {
      mapRef.current?.panTo(camp.lat, camp.lng, getLeftInset(true, detailExpanded));
    }
    setDetailExpanded(false);
    setView({ kind: "campaign-detail", campaign: camp });
  }

  function handleMapSelect(camp: Campaign | null) {
    if (camp) {
      setActiveTab("campaigns");
      openCampaignDetail(camp);
      return;
    }
    setHighlightedCampaign(null);
    if (view.kind === "campaign-detail") goBackToList();
  }

  function openNgoDetail(ngo: NGO) {
    setView({ kind: "ngo-detail", ngo });
  }

  function openNgoDetailByCamp(camp: Campaign) {
    const found = ngos.find((n) => n.id === camp.ngo_id || n.name.toLowerCase() === (camp.ngo_name || "").toLowerCase()) || {
      id: camp.ngo_id,
      name: camp.ngo_name || "Verified NGO",
      email: `contact@${(camp.ngo_name || 'relief').toLowerCase().replace(/[^a-z]/g, '')}.example`,
      phone_number: "+961 1 350 000",
      registration_document: null,
      verification_status: "verified" as const,
    };
    setView({ kind: "ngo-detail", ngo: found });
  }

  function goBackToList() {
    setDetailExpanded(false);
    setView(activeTab === "ngos" ? { kind: "ngo-list" } : { kind: "campaign-list" });
  }

  function handleSwipeStart(e: React.TouchEvent) {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY };
  }
  function handleSwipeEnd(e: React.TouchEvent, direction: "close" | "open") {
    const st = swipeStart.current;
    swipeStart.current = null;
    if (!st) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - st.x;
    const dy = t.clientY - st.y;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // mostly vertical = list scrolling
    if (direction === "close" && dx < -70) setIsSidebarOpen(false);
    if (direction === "open" && dx > 50) setIsSidebarOpen(true);
  }

  const CloseSidebarButton = ({ size = 38 }: { size?: number }) => (
    <button
      type="button"
      onClick={() => setIsSidebarOpen(false)}
      title="Hide sidebar (Esc)"
      aria-label="Hide sidebar"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flex: "none",
        borderRadius: "50%",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#06402F",
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(255,255,255,0.9)",
        cursor: "pointer",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      className="btn ib sec"
      onClick={onClick}
      aria-label="Go back"
      title="Go back"
      style={{
        width: "36px",
        height: "36px",
        minHeight: "36px",
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(255,255,255,0.9)",
        color: "#06402F",
        flex: "none",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );

  const renderCampaignDetail = (camp: Campaign) => {
    const goal = camp.goal || 1;
    const collected = camp.collected_amount || 0;
    const percent = Math.min(100, Math.round((collected / goal) * 100));
    const imgSrc = camp.image_url || getRealFallbackImage(camp.urgency, camp.title);
    const level = camp.urgency === "critical" || camp.urgency === "high" ? camp.urgency : "medium";
    const donors = camp.number_of_donors || 0;
    const ngoRecord = ngos.find((n) => n.id === camp.ngo_id);
    const ngoVerified = !ngoRecord || ngoRecord.verification_status === "verified";

    const stats = [
      { label: "Raised", value: formatMoney(collected) },
      { label: "Goal", value: formatMoney(goal) },
      { label: "Donors", value: String(donors) },
    ];

    return (
      <>
      <div style={{ display: "grid", gridTemplateColumns: detailExpanded ? "minmax(0, 1.15fr) minmax(0, 1fr)" : "1fr", gap: detailExpanded ? 18 : 12, height: "100%", boxSizing: "border-box", overflow: "hidden", paddingRight: "4px", minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, minHeight: 0, flex: "1 1 auto", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton onClick={goBackToList} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="pill" style={{ fontSize: "10px", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", padding: "6px 11px" }}>
              {camp.status.toUpperCase()}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                padding: "6px 13px 6px 11px",
                borderRadius: "99px",
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.9)",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "capitalize",
                color: "#0B2A22",
              }}
            >
              <UrgencyDot urgency={camp.urgency} size={10} />
              {level}
            </span>
            <CloseSidebarButton size={36} />
          </div>
        </div>

        <div
          style={{
            position: "relative",
            height: "184px",
            borderRadius: "24px",
            overflow: "hidden",
            background: "#06402F",
            flex: "none",
            boxShadow: "0 10px 28px rgba(6, 64, 47, 0.2)",
          }}
        >
          <img
            src={imgSrc}
            alt={camp.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getRealFallbackImage(camp.urgency, camp.title);
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(6,40,30,0.05) 25%, rgba(6,40,30,0.9) 100%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "absolute", right: "12px", top: "12px" }}>
            <DonutProgress percent={percent} size={66} />
          </div>
          <div style={{ position: "absolute", bottom: "14px", left: "16px", right: "16px" }}>
            <b style={{ fontSize: "18px", color: "#fff", lineHeight: 1.2, display: "block", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              {camp.title}
            </b>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#D6EEE2", marginTop: "5px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {camp.location_name || "Relief Zone"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openNgoDetailByCamp(camp)}
          title="View NGO profile and all related campaigns"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "8px 12px 8px 8px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.85)",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "Manrope, sans-serif",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "11px",
              background: "linear-gradient(135deg, #06402F, #0F6B4F)",
              color: "#7FD6B2",
              fontWeight: 800,
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            {(camp.ngo_name || "N").charAt(0).toUpperCase()}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Organized by
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "1px" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#0B2A22", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {camp.ngo_name || "Verified NGO"}
              </span>
              {ngoVerified && <VerifiedShield size={15} />}
            </span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06402F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {stats.map((st) => (
            <div
              key={st.label}
              style={{
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(255,255,255,0.85)",
                borderRadius: "16px",
                padding: "10px 12px",
                minWidth: 0,
              }}
            >
              <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {st.label}
              </span>
              <b style={{ display: "block", fontSize: "18px", color: "#0B2A22", marginTop: "2px", letterSpacing: "-0.01em" }}>{st.value}</b>
            </div>
          ))}
        </div>

        <div
          style={{
            flex: "1 1 auto",
            minHeight: 60,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: "16px",
            padding: "10px 12px",
            overflow: "hidden",
          }}
        >
          <span style={{ display: "block", flex: "none", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
            About
          </span>
          <p
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              fontSize: 12,
              color: "#41584F",
              lineHeight: 1.5,
              margin: 0,
              overflowY: "auto",
            }}
          >
            {camp.description}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "none", paddingTop: "4px" }}>
          <button
            type="button"
            className="btn sec"
            onClick={() => onNavigateToLedger(camp.title)}
            title="View Hedera Consensus Ledger for this campaign"
            aria-label="View Hedera Consensus Ledger"
            style={{ width: "46px", height: "46px", minHeight: "46px", borderRadius: "16px", padding: 0, flex: "none", color: "#06402F", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>

          <button
            type="button"
            className="btn am"
            onClick={() => {
              const url = camp.donation_link || "https://give.unrefugees.org/donate";
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            title="Donate on the official NGO portal"
            aria-label="Donate on the official NGO portal"
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              height: "46px",
              minHeight: "46px",
              borderRadius: "16px",
              gap: "7px",
              fontSize: "13px",
              boxShadow: "0 6px 18px rgba(245, 158, 11, 0.4)",
            }}
          >
            <DonateIcon size={18} />
            <span>Donate</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </button>

          <button
            type="button"
            className="btn sec"
            onClick={() => setDetailExpanded(!detailExpanded)}
            style={{ flex: "0 0 122px", height: "46px", minHeight: "46px", borderRadius: "16px", fontSize: "12px", padding: "0 8px" }}
          >
            {detailExpanded ? "Compact" : "Details ↗"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", fontSize: "11px", fontWeight: 700, color: "#0F6B4F" }}>
          <VerifiedShield size={14} title="Anchored on Hedera HCS" />
          <span>Every donation is verified and anchored on Hedera HCS</span>
        </div>
        </div>

        {detailExpanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "none" }}>
              <span className="pill">{(camp.urgency || "high").toUpperCase()}</span>
              <span className="pill">{camp.region || "World"}</span>
              {camp.lat != null && camp.lng != null && (
                <span className="mono" style={{ fontSize: 10, color: "#64748b" }}>
                  {Number(camp.lat).toFixed(4)}, {Number(camp.lng).toFixed(4)}
                </span>
              )}
            </div>

            <CampaignActivityPanel campaignId={camp.id} expanded />
          </div>
        )}
      </div>
      </>
    );
  };

  const renderNgoDetail = (ngo: NGO) => {
    const relatedCampaigns = campaigns.filter((c) => c.ngo_id === ngo.id);
    const raised = relatedCampaigns.reduce((sum, c) => sum + (c.collected_amount || 0), 0);
    const description = (ngo as NGO & { description?: string }).description;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton onClick={goBackToList} />
          <CloseSidebarButton size={36} />
        </div>

        <div style={{ background: "linear-gradient(135deg, #06402F, #0F6B4F)", borderRadius: "22px", padding: "18px", color: "#fff", boxShadow: "0 10px 28px rgba(6,64,47,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "#7FD6B2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "24px",
                color: "#06402F",
                flex: "none",
              }}
            >
              {ngo.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "7px" }}>
              <b style={{ color: "#fff", fontSize: "17px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ngo.name}</b>
              {ngo.verification_status === "verified" && <VerifiedShield size={19} color="#7FD6B2" />}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {ngo.email && (
              <span style={{ background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "11px", padding: "4px 10px", borderRadius: "99px" }}>{ngo.email}</span>
            )}
            {ngo.phone_number && (
              <span style={{ background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: "11px", padding: "4px 10px", borderRadius: "99px" }}>{ngo.phone_number}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            {[
              { label: "Campaigns", value: String(relatedCampaigns.length) },
              { label: "Raised", value: formatMoney(raised) },
            ].map((st) => (
              <div key={st.label} style={{ flex: 1, background: "rgba(255,255,255,0.12)", borderRadius: "14px", padding: "8px 12px" }}>
                <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#BFE3D2", textTransform: "uppercase", letterSpacing: "0.06em" }}>{st.label}</span>
                <b style={{ fontSize: "17px", color: "#fff" }}>{st.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: "18px",
            padding: "12px 14px",
            minHeight: "84px",
            flex: "none",
          }}
        >
          <span style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#41584F", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
            About
          </span>
          <p style={{ fontSize: "13px", lineHeight: 1.55, color: description ? "#41584F" : "#94a3b8", margin: 0 }}>
            {description || "The organization description will appear here."}
          </p>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#41584F", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
            Active Campaigns ({relatedCampaigns.length})
          </span>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "2px" }}>
            {relatedCampaigns.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No active campaigns found.</p>
            ) : (
              relatedCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  onClick={() => openCampaignDetail(camp)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(255,255,255,0.65)",
                    borderRadius: "14px",
                    padding: "10px 12px",
                    cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.8)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <UrgencyDot urgency={camp.urgency} size={10} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0B2A22", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {camp.title}
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06402F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSearchInput = (value: string, onChange: (v: string) => void, label: string) => (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: "38px",
          minHeight: "38px",
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          borderRadius: "99px",
          fontSize: "13px",
          boxSizing: "border-box",
          padding: "0 12px 0 34px",
        }}
      />
    </div>
  );

  const renderCampaignList = () => (
    <>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
        {renderSearchInput(searchQuery, setSearchQuery, "Search campaigns")}

        <div
          role="group"
          aria-label="Filter by urgency"
          style={{ display: "flex", alignItems: "center", gap: "2px", padding: "4px", borderRadius: "99px", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)", flex: "none" }}
        >
          {([
            { key: "all", label: "All urgencies" },
            { key: "critical", label: "Critical only" },
            { key: "high", label: "High only" },
          ] as const).map(({ key, label }) => {
            const active = activeUrgencyFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveUrgencyFilter(key)}
                aria-pressed={active}
                aria-label={label}
                title={label}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: active ? "#fff" : "transparent",
                  boxShadow: active ? "0 2px 8px rgba(6,64,47,0.18)" : "none",
                  color: active ? "#06402F" : "#64748b",
                  fontFamily: "Manrope, sans-serif",
                  fontSize: "11px",
                  fontWeight: 800,
                  transition: "all 0.15s ease",
                }}
              >
                {key === "all" ? "All" : <UrgencyDot urgency={key} size={12} />}
              </button>
            );
          })}
        </div>

        {uniqueNgos.length > 0 && (
          <div
            title={selectedNgo === "all" ? "Filter by NGO" : `NGO: ${selectedNgo}`}
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              flex: "none",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: selectedNgo !== "all" ? "#06402F" : "rgba(255,255,255,0.7)",
              color: selectedNgo !== "all" ? "#fff" : "#06402F",
              border: "1px solid rgba(255,255,255,0.8)",
              boxSizing: "border-box",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <select
              value={selectedNgo}
              onChange={(e) => setSelectedNgo(e.target.value)}
              aria-label="Filter by NGO"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minHeight: 0, opacity: 0, cursor: "pointer", padding: 0, border: "none" }}
            >
              <option value="all">All NGOs</option>
              {uniqueNgos.map((ngo) => (
                <option key={ngo} value={ngo}>{ngo}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: "2px" }}>
        {filteredCampaigns.length === 0 ? (
          <div style={{ padding: "40px 10px", textAlign: "center", color: "#41584F", fontSize: "14px" }}>
            No campaigns match your search.
          </div>
        ) : (
          filteredCampaigns.map((camp) => {
            const goal = camp.goal || 1;
            const collected = camp.collected_amount || 0;
            const percent = Math.min(100, Math.round((collected / goal) * 100));
            const collectedK = collected >= 1000 ? `$${(collected / 1000).toFixed(0)}k` : `$${collected}`;
            const goalK = goal >= 1000 ? `$${(goal / 1000).toFixed(0)}k` : `$${goal}`;

            return (
              <div
                key={camp.id}
                onClick={() => openCampaignDetail(camp)}
                className="pro-campaign-card"
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: "12px",
                  padding: "10px",
                  borderRadius: "20px",
                  background: "rgba(255, 255, 255, 0.48)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: highlightedCampaign?.id === camp.id ? "2px solid #06402F" : "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 4px 14px rgba(6, 64, 47, 0.05)",
                  marginBottom: "10px",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  overflow: "hidden",
                  position: "relative",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ width: "84px", height: "84px", borderRadius: "16px", flex: "none", overflow: "hidden", background: "#0B2A22" }}>
                  <img
                    src={camp.image_url || getRealFallbackImage(camp.urgency, camp.title)}
                    alt={camp.title}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getRealFallbackImage(camp.urgency, camp.title);
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: "14px", color: "#0B2A22", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                      {camp.title}
                    </b>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        openNgoDetailByCamp(camp);
                      }}
                      title="Click to view NGO profile"
                      style={{
                        display: "block",
                        marginTop: "2px",
                        fontSize: "11px",
                        color: "#0F6B4F",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                      }}
                    >
                      by {camp.ngo_name || "Verified NGO"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" }}>
                      <b style={{ color: "#0B2A22" }}>{collectedK}</b> / {goalK}
                    </span>
                    <button
                      type="button"
                      className="btn ib am"
                      aria-label="Donate"
                      title="Donate on official site"
                      style={{ width: "34px", height: "34px", minHeight: "34px", flex: "none" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDonateClick) {
                          onDonateClick(camp);
                        } else {
                          const url = camp.donation_link || "https://give.unrefugees.org/donate";
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <DonateIcon size={17} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", flex: "none", width: "46px" }}>
                  <span style={{ alignSelf: "flex-end", display: "inline-flex", margin: "3px 4px 0 0" }}>
                    <UrgencyDot urgency={camp.urgency} size={11} />
                  </span>
                  <ProgressRing percent={percent} size={44} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  const renderNgoList = () => (
    <>
      <div style={{ display: "flex", marginBottom: "12px" }}>{renderSearchInput(ngoQuery, setNgoQuery, "Search NGOs")}</div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: "2px" }}>
        {filteredNgos.length === 0 ? (
          <div style={{ padding: "40px 10px", textAlign: "center", color: "#41584F", fontSize: "14px" }}>
            {ngos.length === 0 ? "No verified NGOs found." : "No NGOs match your search."}
          </div>
        ) : (
          filteredNgos.map((ngo) => {
            const related = campaigns.filter((c) => c.ngo_id === ngo.id);
            const raised = related.reduce((sum, c) => sum + (c.collected_amount || 0), 0);
            return (
              <div
                key={ngo.id}
                onClick={() => openNgoDetail(ngo)}
                className="pro-campaign-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.48)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  boxShadow: "0 4px 14px rgba(6,64,47,0.05)",
                  marginBottom: "10px",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #06402F, #0F6B4F)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "28px",
                    color: "#7FD6B2",
                    flex: "none",
                  }}
                >
                  {ngo.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                    <b style={{ fontSize: "14px", color: "#0B2A22", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ngo.name}</b>
                    {ngo.verification_status === "verified" && <VerifiedShield size={16} />}
                  </div>
                  {ngo.email && (
                    <span style={{ display: "block", marginTop: "2px", fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ngo.email}
                    </span>
                  )}
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#06402F", background: "rgba(6,64,47,0.08)", padding: "3px 9px", borderRadius: "99px", whiteSpace: "nowrap" }}>
                      {related.length} campaign{related.length !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#06402F", background: "rgba(6,64,47,0.08)", padding: "3px 9px", borderRadius: "99px", whiteSpace: "nowrap" }}>
                      {formatMoney(raised)} raised
                    </span>
                  </div>
                </div>

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06402F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  const isInDetail = view.kind === "campaign-detail" || view.kind === "ngo-detail";

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 72px)",
        position: "relative",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}>
      <InteractiveMap
        ref={mapRef}
        campaigns={filteredCampaigns}
        selectedCampaign={highlightedCampaign}
        onSelectCampaign={handleMapSelect}
        leftInset={getLeftInset(isSidebarOpen, detailExpanded)} />
      <button
        type="button"
        className={`sidebar-fab ${isSidebarOpen ? "fab-hidden" : "fab-visible"}`}
        onClick={() => setIsSidebarOpen(true)}
        title="Show campaigns"
        aria-label="Show campaigns"
        tabIndex={isSidebarOpen ? -1 : 0}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
        </svg>
        {filteredCampaigns.length > 0 && <span className="sidebar-fab-badge">{filteredCampaigns.length}</span>}
      </button>

      {!isSidebarOpen && (
        <div
          className="sidebar-edge-swipe"
          onTouchStart={handleSwipeStart}
          onTouchEnd={(e) => handleSwipeEnd(e, "open")}
        />
      )}

      <div
          className={`map-sidebar-frosted ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
          aria-hidden={!isSidebarOpen}
          onTouchStart={handleSwipeStart}
          onTouchEnd={(e) => handleSwipeEnd(e, "close")}
          style={{
            position: "absolute",
            left: "14px",
            top: "14px",
            bottom: "14px",
            width: detailExpanded && view.kind === "campaign-detail" ? "min(980px, calc(100vw - 40px))" : "410px",
            maxWidth: "calc(100vw - 28px)",
            transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
            background: "rgba(255, 255, 255, 0.42)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "1px solid rgba(255, 255, 255, 0.55)",
            borderRadius: "28px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(6, 64, 47, 0.18), 0 0 0 1px rgba(255,255,255,0.3)",
            zIndex: 900,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {!isInDetail && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div
                role="tablist"
                style={{ flex: 1, display: "flex", gap: "4px", padding: "4px", borderRadius: "99px", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)" }}
              >
                {([
                  { key: "campaigns", label: "Campaigns", count: filteredCampaigns.length },
                  { key: "ngos", label: "NGOs", count: ngos.length },
                ] as const).map(({ key, label, count }) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setDetailExpanded(false);
                        setActiveTab(key);
                        setView({ kind: key === "campaigns" ? "campaign-list" : "ngo-list" });
                      }}
                      style={{
                        flex: 1,
                        minHeight: "34px",
                        borderRadius: "99px",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "7px",
                        background: active ? "#06402F" : "transparent",
                        color: active ? "#fff" : "#41584F",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: "13px",
                        fontWeight: 800,
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                    >
                      {label}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          lineHeight: 1,
                          padding: "3px 6px",
                          borderRadius: "99px",
                          background: active ? "rgba(255,255,255,0.2)" : "rgba(6,64,47,0.09)",
                          color: active ? "#fff" : "#06402F",
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <CloseSidebarButton />
            </div>
          )}

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {view.kind === "campaign-list" && renderCampaignList()}
            {view.kind === "ngo-list" && renderNgoList()}
            {view.kind === "campaign-detail" && renderCampaignDetail(view.campaign)}
            {view.kind === "ngo-detail" && renderNgoDetail(view.ngo)}
          </div>
        </div>

      <div
        style={{
          position: "absolute",
          right: "24px",
          bottom: "44px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 900,
        }}
      >
        <button
          type="button"
          className="btn"
          style={{ ...mapBtnStyle, marginBottom: "6px" }}
          aria-label="Center map on campaigns"
          title="Center map on campaigns"
          onClick={() => mapRef.current?.recenter(getLeftInset(isSidebarOpen, detailExpanded))}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button type="button" className="btn" style={mapBtnStyle} aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          +
        </button>
        <button type="button" className="btn" style={mapBtnStyle} aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          −
        </button>
      </div>
    </div>
  );
};