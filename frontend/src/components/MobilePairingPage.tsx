import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api";

interface Props {
  code: string;
}

const SCANNER_ID = "amanah-qr-reader";

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Use your camera to scan the QR code printed on your receipt, or enter its code below.");
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // already stopped
    }
    try {
      scanner.clear();
    } catch {
      // container already cleared
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        void scanner.stop().catch(() => undefined);
        void Promise.resolve(scanner.clear()).catch(() => undefined);
      }
    };
  }, []);

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
      await stopScanner();
      setToken(receiptToken);
      setDone(true);
      setStatus("Receipt sent. The paired device will show the verification result.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Receipt could not be sent");
    } finally {
      setSubmitting(false);
    }
  }

  async function startCamera() {
    await stopScanner();
    try {
      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;
      setScanning(true);
      setStatus("Camera active — point it at the QR code on your receipt.");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          setToken(normalizeToken(decodedText));
          await submit(decodedText);
        },
        () => {
          // ignore frames without a QR code
        }
      );
    } catch (err) {
      await stopScanner();
      setStatus(
        `Camera could not start: ${err instanceof Error ? err.message : String(err)}. Enter the code manually instead.`
      );
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

        <div
          id={SCANNER_ID}
          style={{
            width: "100%",
            minHeight: 220,
            borderRadius: "14px",
            overflow: "hidden",
            background: "#0f172a",
          }}
        />

        {!done && (
          <>
            {scanning ? (
              <button type="button" className="btn sec" onClick={stopScanner}>Stop camera</button>
            ) : (
              <button type="button" className="btn sec" onClick={startCamera} disabled={submitting}>
                Start camera
              </button>
            )}
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
