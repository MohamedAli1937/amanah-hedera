import { useState, useEffect } from "react";
import { api, getToken, logout as apiLogout } from "./api";
import type {
  Page,
  User,
  Campaign,
  LedgerTransaction,
  UserProfile,
  AidEvent,
  NGOStatus,
} from "./types";
import { Navbar } from "./components/Navbar";
import { CampaignsPage } from "./components/CampaignsPage";
import { ProfilePage } from "./components/ProfilePage";
import { LedgerPage } from "./components/LedgerPage";
import { AuthModal } from "./components/AuthModal";
import { ReceiptLookupModal } from "./components/ReceiptLookupModal";
import { HederaProofModal } from "./components/HederaProofModal";
import { getRealFallbackImage } from "./utils/geoData";
import "./App.css";

const EMPTY_PROFILE: UserProfile = {
  name: "Account",
  email: "",
  avatar_url: "/amanah-logo.svg",
  is_verified: true,
  donations_count: 0,
  general_impact_percent: 0,
  total_donated_stats: "0",
  supported_campaigns: [],
  verified_donations: [],
};

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>("campaigns");
  const [user, setUser] = useState<User | null>(null);

  // Campaign data comes exclusively from the backend API (Neon).
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dashboardCampaigns, setDashboardCampaigns] = useState<Campaign[]>([]);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [ngoStatus, setNgoStatus] = useState<NGOStatus | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [selectedLedgerCampaign, setSelectedLedgerCampaign] = useState<string>("all");

  // Modals
  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | null>(null);
  const [showReceiptLookup, setShowReceiptLookup] = useState<boolean>(false);
  const [lookupInitialHash, setLookupInitialHash] = useState<string>("");
  const [auditEvent, setAuditEvent] = useState<AidEvent | null>(null);

  // Fetch campaigns from the API. Neon is the single source of truth.
  async function fetchRealCampaigns() {
    try {
      const data = await api<any[]>("/campaigns/");
      if (!Array.isArray(data)) return;
      const mapped: Campaign[] = data.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        goal: Number(b.goal),
        collected_amount: Number(b.collected_amount || 0),
        number_of_donors: Number(b.number_of_donors || 0),
        recorded_expenses: Number(b.recorded_expenses || 0),
        recorded_balance: Number(b.recorded_balance || 0),
        status: b.status,
        urgency: b.urgency || "high",
        region: b.region || "World",
        location_name: b.location_name || "Relief Zone",
        lat: b.lat !== null && b.lat !== undefined ? Number(b.lat) : 20.0,
        lng: b.lng !== null && b.lng !== undefined ? Number(b.lng) : 15.0,
        image_url: b.image_url || getRealFallbackImage(b.urgency, b.title),
        ngo_id: b.ngo_id,
        ngo_name: b.ngo_name || "Verified NGO",
        donation_link: b.donation_link,
        created_at: b.created_at,
      }));
      setCampaigns(mapped);
      setSelectedCampaign((prev) => (prev ? mapped.find((c) => c.id === prev.id) ?? null : null));
    } catch {
      setCampaigns([]);
    }
  }

  async function fetchDashboardData(currentUser: User) {
      if (currentUser.role !== "ngo_admin") {
        setDashboardCampaigns([]);
        setNgoStatus(null);
        setProfile({
          ...EMPTY_PROFILE,
          email: currentUser.email,
          name: currentUser.email,
        });
        return;
      }

      setDashboardError(null);
      try {
        const status = await api<NGOStatus>("/ngos/me/status");
        setNgoStatus(status);
        setProfile({
          ...EMPTY_PROFILE,
          name: status.ngo_name,
          email: status.email,
          is_verified: status.verification_status === "verified",
        });

        if (status.verification_status !== "verified") {
          setDashboardCampaigns([]);
          setDashboardError(`Your NGO application is ${status.verification_status}. Campaign and donation tools will be available after moderator approval.`);
          return;
        }

        const campaignData = await api<any[]>("/campaigns/mine");

        const mappedCampaigns: Campaign[] = (campaignData || []).map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description,
          goal: Number(b.goal),
          collected_amount: Number(b.collected_amount || 0),
          number_of_donors: Number(b.number_of_donors || 0),
          recorded_expenses: Number(b.recorded_expenses || 0),
          recorded_balance: Number(b.recorded_balance || 0),
          status: b.status,
          urgency: b.urgency || "high",
          region: b.region || "Middle East",
          location_name: b.location_name || "Relief Zone",
          lat: b.lat !== null && b.lat !== undefined ? Number(b.lat) : 31.45,
          lng: b.lng !== null && b.lng !== undefined ? Number(b.lng) : 34.38,
          image_url: b.image_url || getRealFallbackImage(b.urgency, b.title),
          ngo_id: b.ngo_id,
          ngo_name: b.ngo_name || status.ngo_name || "Verified NGO",
          donation_link: b.donation_link,
          created_at: b.created_at,
        }));

        setDashboardCampaigns(mappedCampaigns);
        setDashboardError(null);
      } catch (err) {
        setDashboardCampaigns([]);
        setDashboardError(err instanceof Error ? err.message : "Unable to load your NGO dashboard");
      }
  }

  // 2. Fetch real on-chain events from Postgres Neon & Hedera
  async function fetchRealLedgerTransactions() {
    try {
      const data = await api<any[]>("/events/recent?limit=50");
      if (Array.isArray(data) && data.length > 0) {
        const realTxs: LedgerTransaction[] = data.map((item) => ({
          id: `real-${item.id}`,
          tx_id: item.hedera_transaction_id || "",
          date_time: item.created_at
            ? item.created_at.replace("T", " ").slice(0, 19)
            : "—",
          campaign_name: item.campaign_title || `Campaign #${item.campaign_id}`,
          campaign_id: item.campaign_id,
          amount: Number(item.amount ?? 0),
          sender: item.donor_name || "Anonymous",
          verification_status:
            item.hedera_status === "confirmed"
              ? "Confirmed by HCS"
              : item.hedera_status === "failed"
              ? "Failed"
              : "Pending",
          receipt_code: item.receipt_token || "",
          allocation_title: (item.event_type || "Milestone").toUpperCase(),
          allocation_amount: Number(item.amount ?? 0),
          hashscan_url: item.hashscan_tx_url,
          hedera_topic_id: item.hedera_topic_id || null,
          raw_event: {
            id: item.id,
            campaign_id: item.campaign_id,
            event_type: item.event_type,
            description: item.description,
            proof_url: item.proof_url,
            created_at: item.created_at,
            event_hash: item.event_hash,
            hedera_topic_id: item.hedera_topic_id,
            hedera_transaction_id: item.hedera_transaction_id,
            hedera_sequence_number: item.hedera_sequence_number,
            hedera_status: item.hedera_status,
            review_status: "approved",
          },
        }));
        setTransactions(realTxs);
      }
    } catch {
      // Fallback
    }
  }

  useEffect(() => {
    fetchRealCampaigns();
    fetchRealLedgerTransactions();
    if (getToken()) {
      api<User>("/auth/me")
        .then(async (currentUser) => {
          setUser(currentUser);
          await fetchDashboardData(currentUser);
        })
        .catch(() => apiLogout());
    }
  }, []);

  function handleAuthSuccess(currentUser: User) {
    setUser(currentUser);
    fetchDashboardData(currentUser);
    setAuthModalMode(null);
    setCurrentPage("profile");
  }

  function handleLogout() {
    apiLogout();
    setUser(null);
    setCurrentPage("campaigns");
  }

  return (
    <div className="pg full-width">
      {/* Top Unified Glass Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page === "ledger") setSelectedLedgerCampaign("all");
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onOpenReceipt={() => {
          setLookupInitialHash("");
          setShowReceiptLookup(true);
        }}
      />

      {/* Main Full-Width Content (Side-to-Side) */}
      <main style={{ width: "100%", margin: 0, padding: 0 }}>
        {/* PAGE 1: CAMPAIGNS (Home Screen with Edge-to-Edge Map & Floating Sidebar) */}
        {currentPage === "campaigns" && (
          <CampaignsPage
            campaigns={campaigns}
            selectedCampaignId={selectedCampaign?.id}
            onNavigateToLedger={(campaignTitle) => {
              setSelectedLedgerCampaign(campaignTitle);
              setCurrentPage("ledger");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDonateClick={(camp) => {
              const url = camp.donation_link || "https://give.unrefugees.org/donate";
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          />
        )}

        {/* PAGE 2: PROFILE */}
        {currentPage === "profile" && (
          <ProfilePage
            profile={profile}
            user={user}
            campaigns={user?.role === "ngo_admin" ? dashboardCampaigns : campaigns}
            dashboardError={dashboardError}
            ngoStatus={ngoStatus}
            onBack={() => setCurrentPage("campaigns")}
            onOpenCampaign={(campId) => {
              const availableCampaigns = user?.role === "ngo_admin" ? dashboardCampaigns : campaigns;
              const found = availableCampaigns.find((c) => c.id === campId) || availableCampaigns[0];
              if (found) {
                setSelectedCampaign(found);
                setCurrentPage("campaigns");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            onDonationRecorded={async () => {
              await fetchRealCampaigns();
              if (user) await fetchDashboardData(user);
              await fetchRealLedgerTransactions();
            }}
          />
        )}

        {/* PAGE 3: LEDGER (100% Real Hedera Consensus Records) */}
        {currentPage === "ledger" && (
          <LedgerPage
            transactions={transactions}
            selectedCampaignFilterInitial={selectedLedgerCampaign}
            onBack={() => setCurrentPage("campaigns")}
            onOpenReceipt={(code) => {
              setLookupInitialHash(code);
              setShowReceiptLookup(true);
            }}
            onOpenTxAudit={(tx) => {
              if (tx.raw_event) {
                setAuditEvent(tx.raw_event);
              } else {
                const eventId = String(tx.id).replace("real-", "");
                setAuditEvent({
                  id: eventId,
                  campaign_id: tx.campaign_id,
                  event_type: "distribution",
                  description: `Consensus record for ${tx.campaign_name}`,
                  proof_url: null,
                  created_at: tx.date_time,
                  event_hash: null,
                  hedera_topic_id: tx.hedera_topic_id || "",
                  hedera_transaction_id: tx.tx_id,
                  hedera_sequence_number: null,
                  hedera_status: "confirmed",
                  review_status: "approved",
                });
              }
            }}
          />
        )}
      </main>

      {/* Sign In & Sign Up Modal */}
      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={handleAuthSuccess}
          onSwitchMode={(mode) => setAuthModalMode(mode)}
        />
      )}

      {/* Quick Receipt Verification Modal */}
      {showReceiptLookup && (
        <ReceiptLookupModal
          initialToken={lookupInitialHash}
          onClose={() => {
            setShowReceiptLookup(false);
            setLookupInitialHash("");
          }}
        />
      )}

      {/* Hedera Consensus Proof Audit Modal */}
      {auditEvent && (
        <HederaProofModal
          event={auditEvent}
          onClose={() => setAuditEvent(null)}
        />
      )}
    </div>
  );
}

export default App;
