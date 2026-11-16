import { api } from "../api";

export interface NetworkConfig {
  network: string;
  account_id: string | null;
  topic_id: string | null;
  hashscan_base: string;
}

let cached: NetworkConfig | null = null;
let pending: Promise<NetworkConfig> | null = null;

const FALLBACK: NetworkConfig = {
  network: "testnet",
  account_id: null,
  topic_id: null,
  hashscan_base: "https://hashscan.io/testnet",
};

export function hashscanTxUrl(txId?: string | null): string | null {
  if (!txId) return null;
  return `${(cached ?? FALLBACK).hashscan_base}/transaction/${encodeURIComponent(txId)}`;
}

export function hashscanTopicUrl(topicId?: string | null): string | null {
  if (!topicId) return null;
  return `${(cached ?? FALLBACK).hashscan_base}/topic/${encodeURIComponent(topicId)}`;
}

/** Fetches public Hedera metadata from the backend once and caches it. */
export function getNetworkConfig(): Promise<NetworkConfig> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = api<NetworkConfig>("/network")
      .then((config) => (cached = config))
      .catch(() => (cached = FALLBACK))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
