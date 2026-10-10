import React from "react";
import type { Page, User } from "../types";

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User | null;
  onLogout: () => void;
  onOpenAuth: (mode: "login" | "register") => void;
  onOpenReceipt: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentPage,
  onNavigate,
  user,
  onLogout,
  onOpenAuth,
  onOpenReceipt,
}) => {
  const isCampaignsActive = currentPage === "campaigns" || currentPage === "campaign-detail";
  const isLedgerActive = currentPage === "ledger";
  const isProfileActive = currentPage === "profile";

  return (
    <header className="clean-topbar">
      <div className="topbar-inner">
        {/* Brand Logo */}
        <div className="brand-logo" onClick={() => onNavigate("campaigns")}>
          <div className="brand-icon-box">
            <img src="/amanah-logo.svg" alt="" />
          </div>
          <span className="brand-text">Amanah</span>
        </div>

        {/* Navigation Items */}
        <nav className="nav-items-group">
          <button
            className={`nav-tab-btn ${isCampaignsActive ? "active" : ""}`}
            onClick={() => onNavigate("campaigns")}
          >
            Campaigns
          </button>

          <button
            className={`nav-tab-btn ${isLedgerActive ? "active" : ""}`}
            onClick={() => onNavigate("ledger")}
          >
            Hedera Audit Ledger
          </button>
          <button className="nav-tab-btn" onClick={onOpenReceipt}>
            Verify Receipt
          </button>

          {user ? (
            <>
              <button
                className={`nav-tab-btn ${isProfileActive ? "active" : ""}`}
                onClick={() => onNavigate("profile")}
              >
                Profile
              </button>
              <button className="nav-link-logout" onClick={onLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                className="nav-link-plain"
                onClick={() => onOpenAuth("login")}
              >
                Login
              </button>
              <button
                className="nav-btn-register-solid"
                onClick={() => onOpenAuth("register")}
              >
                Register
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
