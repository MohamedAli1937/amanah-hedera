import L from "leaflet";
if (typeof window !== "undefined") {
  (window as any).L = L;
}

import React, { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { MobilePairingPage } from "./components/MobilePairingPage";
import "./index.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Amanah ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#081F19",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "12px", color: "#10B981" }}>Amanah Aid Platform</h2>
          <p style={{ maxWidth: "500px", color: "#9CA3AF", marginBottom: "20px" }}>
            An unexpected error occurred during rendering. Please reload the page.
          </p>
          <pre style={{
            background: "rgba(255,255,255,0.06)",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#F87171",
            maxWidth: "600px",
            overflowX: "auto",
            marginBottom: "20px"
          }}>
            {this.state.error?.message || "Unknown error"}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#0F6B4F",
              color: "#fff",
              border: 0,
              borderRadius: "8px",
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Reload Platform
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const scanMatch = window.location.hash.match(/^#\/scan\/([^/]+)$/);
const root = createRoot(document.getElementById("root")!);

if (scanMatch) {
  root.render(
    <ErrorBoundary>
      <MobilePairingPage code={decodeURIComponent(scanMatch[1])} />
    </ErrorBoundary>,
  );
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
