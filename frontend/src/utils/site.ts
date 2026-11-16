/**
 * Public origin used in QR codes that a second device (phone) must be able to open.
 * Falls back to the current origin and strips any trailing slash.
 */
export function getSiteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  const origin = configured || (typeof window !== "undefined" ? window.location.origin : "");
  return origin.replace(/\/+$/, "");
}
