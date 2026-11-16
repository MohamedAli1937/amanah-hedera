import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  token: string;
  size?: number;
  className?: string;
  label?: string;
}

/**
 * QR encoding the raw receipt token. Print this next to the code on a paper
 * receipt so a phone can scan it during PC ↔ phone pairing.
 */
export const ReceiptQr: React.FC<Props> = ({ token, size = 120, className, label }) => {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let active = true;
    setSvg("");
    QRCode.toString(token, {
      type: "svg",
      width: size,
      margin: 1,
      color: { dark: "#06402F", light: "#FFFFFF" },
    })
      .then((markup) => {
        if (active) setSvg(markup);
      })
      .catch(() => {
        if (active) setSvg("");
      });
    return () => {
      active = false;
    };
  }, [token, size]);

  return (
    <div className={className} style={{ display: "grid", justifyItems: "center", gap: "6px" }}>
      <div
        style={{
          width: size + 12,
          height: size + 12,
          display: "grid",
          placeItems: "center",
          background: "#fff",
          borderRadius: "10px",
          border: "1px solid rgba(6,64,47,0.12)",
          padding: "4px",
          boxSizing: "border-box",
        }}
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      {svg ? (
        <span style={{ fontSize: "10px", color: "#64748b", textAlign: "center", lineHeight: 1.35 }}>
          {label || "Scan with phone"}
        </span>
      ) : (
        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Generating QR…</span>
      )}
    </div>
  );
};

export default ReceiptQr;
