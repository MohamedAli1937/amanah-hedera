export type User = {
  id: number;
  email: string;
  name?: string;
  role: "platform_admin" | "ngo_admin" | "donor";
  ngo_id: number | null;
  is_active: boolean;
};

export type NGO = {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  registration_document: string | null;
  verification_status: "pending" | "verified" | "rejected";
};

export type NGOStatus = {
  ngo_id: number;
  ngo_name: string;
  email: string;
  phone_number: string | null;
  registration_document: string | null;
  verification_status: "pending" | "verified" | "rejected";
  account_active: boolean;
};

export type Campaign = {
  id: number;
  title: string;
  description: string;
  goal: number;
  collected_amount: number;
  number_of_donors: number;
  recorded_expenses: number;
  recorded_balance: number;
  status: "draft" | "active" | "goal_reached" | "completed" | "suspended";
  urgency?: "high" | "critical" | "medium";
  region?: "Middle East" | "North Africa" | "East Africa";
  location_name?: string;
  lat?: number;
  lng?: number;
  image_url?: string;
  ngo_id: number;
  donation_link?: string | null;
  created_at?: string;
};

export type Expense = {
  id: number;
  campaign_id: number;
  amount: number;
  category?: string;
  description: string;
  proof_url: string | null;
  created_at: string;
};

export type AidEvent = {
  id: number;
  campaign_id: number;
  event_type: "purchase" | "shipment" | "arrival" | "distribution" | "completed";
  description: string;
  proof_url: string | null;
  created_at: string;
  event_hash: string | null;
  hedera_topic_id: string | null;
  hedera_transaction_id: string | null;
  hedera_sequence_number: number | null;
  hedera_status: "pending" | "confirmed" | "failed";
};

export type Donation = {
  id: number;
  campaign_id: number;
  amount: number;
  status: "pending" | "confirmed" | "rejected";
  receipt_token: string | null;
  created_at: string;
};

export type AidEventVerification = {
  event_id: number;
  canonical_payload: Record<string, unknown>;
  calculated_hash: string;
  stored_hash: string | null;
  is_valid: boolean;
  verified_at_mirror_node?: boolean;
  consensus_timestamp?: string | null;
  running_hash?: string | null;
  hedera_topic_id: string | null;
  hedera_sequence_number: number | null;
  hedera_transaction_id: string | null;
  hedera_status: string;
  hashscan_tx_url: string | null;
  hashscan_topic_url: string | null;
  verification_message?: string | null;
};

export type ReceiptVerification = {
  receipt_token: string;
  donation_id: number;
  campaign_id: number;
  campaign_title: string;
  amount: number | string;
  donor_name?: string | null;
  donation_status: string;
  confirmed_at: string;
  ngo_name: string;
  ngo_verification_status: string;
  events_count: number;
  donation_hash?: string | null;
  hedera_topic_id?: string | null;
  hedera_sequence_number?: number | null;
  hedera_transaction_id?: string | null;
  is_verified_onchain?: boolean;
  consensus_timestamp?: string | null;
  hashscan_tx_url?: string | null;
  hashscan_topic_url?: string | null;
};

export type LedgerTransaction = {
  id: string | number;
  tx_id: string;
  date_time: string;
  campaign_name: string;
  campaign_id: number;
  amount: number;
  sender: string;
  verification_status: "Confirmed by HCS" | "Pending" | "Failed";
  receipt_code: string;
  allocation_title: string;
  allocation_amount: number;
  hashscan_url: string | null;
  is_demo: boolean;
  raw_event?: AidEvent;
};

export type UserProfile = {
  name: string;
  email: string;
  avatar_url: string;
  is_verified: boolean;
  donations_count: number;
  general_impact_percent: number;
  total_donated_stats: string;
  supported_campaigns: {
    campaign_id: number;
    title: string;
    image_url: string;
    urgency: string;
    summary: string;
  }[];
  verified_donations: {
    id: string;
    date: string;
    amount: number;
    receipt_hash: string;
    campaign_title: string;
  }[];
};

export type Page = "campaigns" | "campaign-detail" | "profile" | "ledger" | "login" | "register";

export type ConsensusFeedItem = {
  id: string;
  tx_id: string;
  timestamp: string;
  event_type: "purchase" | "shipment" | "arrival" | "distribution" | "completed";
  campaign: string;
  campaign_id?: number;
  usd_value: number;
  hbar_equivalent: number;
  latency_seconds: number;
  is_demo: boolean;
  hashscan_url?: string | null;
  proof_url?: string | null;
  description?: string;
  raw_aid_event?: AidEvent;
};
