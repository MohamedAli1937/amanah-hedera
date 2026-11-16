import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

export interface IssuedReceipt {
  receipt_token: string;
  amount: number | string;
  campaign_title: string;
  donor_name?: string | null;
  hedera_sequence_number?: number | null;
  hedera_transaction_id?: string | null;
}

interface Props {
  receipt: IssuedReceipt;
  onClose: () => void;
}

export const IssuedReceiptCard: React.FC<Props> = ({ receipt, onClose }) => {
  const [svg, setSvg] = useState("");
  const [png, setPng] = useState("");
  const [copied, setCopied] = useState(false);
  const token = receipt.receipt_token;

  useEffect(() => {
    let active = true;
    Promise.all([
      QRCode.toString(token, { type: "svg", width: 228, margin: 1, color: { dark: "#06402F", light: "#FFFFFF" } }),
      QRCode.toDataURL(token, { width: 640, margin: 1, color: { dark: "#06402F", light: "#FFFFFFFF" } }),
    ])
      .then(([svgMarkup, dataUrl]) => {
        if (!active) return;
        setSvg(svgMarkup);
        setPng(dataUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]);

  function copyCode() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function download(kind: "png" | "svg") {
    const link = document.createElement("a");
    link.download = `amanah-receipt-${token}.${kind}`;
    if (kind === "png") {
      link.href = png;
    } else {
      link.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (kind === "svg") window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function printReceipt() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Amanah Receipt ${token}</title>
      <style>body{font-family:Arial,sans-serif;padding:28px;text-align:center;color:#06402F}
      h1{font-size:22px;margin:0 0 4px}.code{font-family:monospace;font-size:18px;font-weight:bold;margin:12px 0}
      img{width:280px;height:280px}.meta{font-size:13px;color:#41584F;line-height:1.7}</style></head><body>
      <h1>Amanah · Verified Donation Receipt</h1>
      <img src="${png}" alt="Receipt QR" />
      <div class="code">${token}</div>
      <div class="meta">Campaign: ${receipt.campaign_title}<br />Amount: $${Number(receipt.amount).toLocaleString()}<br />
      ${receipt.donor_name ? `Donor: ${receipt.donor_name}<br />` : ""}
      ${receipt.hedera_sequence_number ? `Hedera HCS sequence: #${receipt.hedera_sequence_number}<br />` : ""}
      Scan the QR to verify this receipt on Amanah.</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="modal-backdrop-frosted" onClick={onClose}>
      <div
        className="modal-card-frosted"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(620px, 95vw)", maxHeight: "92vh", overflowY: "auto", padding: "26px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="pill" style={{ background: "#06402F", color: "#7FD6B2", fontWeight: 800 }}>
              RECEIPT ISSUED · HEDERA HCS
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0B2A22", margin: "8px 0 0" }}>
              Donation receipt ready
            </h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
            gap: "22px",
            alignItems: "center",
            marginTop: "20px",
          }}
        >
          <div style={{ display: "grid", justifyItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 244,
                height: 244,
                display: "grid",
                placeItems: "center",
                background: "#fff",
                borderRadius: "18px",
                padding: 8,
                boxSizing: "border-box",
                border: "1px solid rgba(6,64,47,0.12)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              }}
              dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
            />
            <span style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>
              Scan this QR with a phone to send the receipt to a paired screen.
            </span>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <span className="eyebrow">Receipt code</span>
              <div
                className="mono"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 6,
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "rgba(6,64,47,0.07)",
                  border: "1px solid rgba(6,64,47,0.12)",
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#06402F",
                  wordBreak: "break-all",
                }}
              >
                <span>{token}</span>
                <button type="button" className="btn sec" onClick={copyCode} style={{ flex: "none", padding: "6px 12px", minHeight: 34 }}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "6px", fontSize: 13, color: "#41584F" }}>
              <div><b>Campaign:</b> {receipt.campaign_title}</div>
              <div><b>Amount:</b> <span className="mono">${Number(receipt.amount).toLocaleString()}</span></div>
              {receipt.donor_name && <div><b>Donor:</b> {receipt.donor_name}</div>}
              {receipt.hedera_sequence_number && <div><b>HCS sequence:</b> #{receipt.hedera_sequence_number}</div>}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn am" onClick={() => download("png")} disabled={!png}>Download PNG</button>
              <button type="button" className="btn sec" onClick={() => download("svg")} disabled={!svg}>Download SVG</button>
              <button type="button" className="btn sec" onClick={printReceipt} disabled={!png}>Print</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuedReceiptCard;
