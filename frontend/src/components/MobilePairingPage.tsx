import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Props {
  code: string;
}

interface Detector {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
}

function normalizeToken(value: string): string {
  const raw = value.trim();
  try {
    const url = new URL(raw);
    return (
      url.searchParams.get("token") ||
      decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || raw)
    );
  } catch {
    return raw;
  }
}

export const MobilePairingPage: React.FC<Props> = ({ code }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Use your camera to scan a receipt QR, or enter its code below.");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function submit(value = token) {
    const receiptToken = normalizeToken(value);
    if (!receiptToken) return;
    setSubmitting(true);
    setStatus("Sending receipt to the paired device…");
    try {
      await api(`/pairing/sessions/${encodeURIComponent(code)}/submit`, {
        method: "POST",
        body: JSON.stringify({ receipt_token: receiptToken }),
      });
      setToken(receiptToken);
      setDone(true);
      setStatus("Receipt sent. The paired device will show the verification result.");
      stopCamera();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Receipt could not be sent");
    } finally {
      setSubmitting(false);
    }
  }

  async function startCamera() {
    const DetectorClass = (
      window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => Detector }
    ).BarcodeDetector;
    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setStatus("Camera scanning is not supported by this browser. Enter the receipt code manually.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new DetectorClass({ formats: ["qr_code"] });
      const scan = async () => {
        if (!videoRef.current || done) return;
        try {
          const results = await detector.detect(videoRef.current);
          const value = results[0]?.rawValue?.trim();
          if (value) {
            setToken(normalizeToken(value));
            await submit(value);
            return;
          }
        } catch {
          // keep scanning
        }
        window.requestAnimationFrame(scan);
      };
      window.requestAnimationFrame(scan);
    } catch {
      setStatus("Camera access was denied. Enter the receipt code manually.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "#f8faf9",
        fontFamily: "Manrope, system-ui, sans-serif",
      }}
    >
      <section
        className="card"
        style={{ width: "min(100%, 430px)", padding: "20px", display: "grid", gap: "12px" }}
      >
        <img src="/amanah-logo.svg" alt="Amanah" style={{ width: "54px", height: "54px" }} />
        <div>
          <span className="eyebrow">Amanah HCS Audit</span>
          <h1 style={{ margin: "4px 0 0", color: "#064e3b", fontSize: "22px" }}>Verify a receipt</h1>
        </div>
        <p style={{ margin: 0, color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>{status}</p>

        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", borderRadius: "14px", background: "#0f172a", minHeight: "200px" }}
        />

        {!done && (
          <>
            <button type="button" className="btn sec" onClick={startCamera} disabled={submitting}>
              Start camera
            </button>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Or enter receipt code"
              autoComplete="off"
              className="mono"
            />
            <button
              type="button"
              className="btn am"
              onClick={() => submit()}
              disabled={submitting || !token.trim()}
            >
              {submitting ? "Sending…" : "Send receipt to PC"}
            </button>
          </>
        )}

        {done && (
          <div className="auth-alert success">
            Verified receipt sent successfully. You can close this page.
          </div>
        )}
      </section>
    </main>
  );
};

export default MobilePairingPage;
