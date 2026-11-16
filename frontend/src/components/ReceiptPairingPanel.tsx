import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import type { ReceiptVerification } from "../types";
import { getSiteUrl } from "../utils/site";

interface Props {
  onReceipt: (receipt: ReceiptVerification) => void;
}

interface Session {
  code: string;
  poll_secret: string;
  expires_at: string;
  scan_path: string;
}

export const ReceiptPairingPanel: React.FC<Props> = ({ onReceipt }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState("Creating a secure pairing session…");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  async function startSession() {
    if (timer.current) window.clearInterval(timer.current);
    setError(null);
    setSvg("");
    setStatus("Creating a secure pairing session…");
    try {
      const next = await api<Session>("/pairing/sessions", { method: "POST" });
      if (!mounted.current) return;
      setSession(next);
      setStatus("Waiting for your phone to scan and send the receipt…");

      const scanUrl = `${getSiteUrl()}${next.scan_path}`;
      const markup = await QRCode.toString(scanUrl, {
        type: "svg",
        width: 176,
        margin: 1,
        color: { dark: "#06402F", light: "#FFFFFF" },
      });
      if (!mounted.current) return;
      setSvg(markup);

      timer.current = window.setInterval(async () => {
        try {
          const result = await api<{ status: string; result?: ReceiptVerification }>(
            `/pairing/sessions/${encodeURIComponent(next.code)}?secret=${encodeURIComponent(next.poll_secret)}`
          );
          if (!mounted.current) return;
          if (result.status === "expired") {
            if (timer.current) window.clearInterval(timer.current);
            setStatus("This QR code expired.");
            setError("Session expired. Generate a new code.");
            return;
          }
          if (result.status === "ready" && result.result) {
            if (timer.current) window.clearInterval(timer.current);
            setSession(null);
            onReceipt(result.result);
          }
        } catch {
          // transient polling failure – keep trying until TTL expires
        }
      }, 1500);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : "Unable to create pairing session");
      setStatus("");
    }
  }

  useEffect(() => {
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: "10px", width: "100%" }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: "12.5px", textAlign: "center", lineHeight: 1.55 }}>
        Scan this code with your phone, then scan the QR on your printed donation receipt.
        The verified receipt will appear here automatically.
      </p>

      {svg ? (
        <div
          className="receipt-viewfinder"
          style={{ display: "grid", placeItems: "center", padding: "10px", background: "#fff" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div
          className="receipt-viewfinder"
          style={{ display: "grid", placeItems: "center", color: "#64748b", fontSize: "12px" }}
        >
          {status || "Preparing QR code…"}
        </div>
      )}

      <span style={{ color: "#0F6B4F", fontSize: "12px", fontWeight: 800, textAlign: "center" }}>{status}</span>

      <span className="mono" style={{ fontSize: "10px", color: "#94a3b8", wordBreak: "break-all", textAlign: "center" }}>
        {session ? `${getSiteUrl()}${session.scan_path}` : ""}
      </span>

      {error && <div className="auth-alert error">{error}</div>}
      <button type="button" className="btn sec" onClick={startSession}>
        Generate a new QR code
      </button>
    </div>
  );
};

export default ReceiptPairingPanel;
