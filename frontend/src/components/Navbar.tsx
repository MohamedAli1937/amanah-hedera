import React, { useEffect, useState } from "react";
import type { Page, User } from "../types";

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User | null;
  onLogout: () => void;
  onOpenAuth: (mode: "login" | "register") => void;
  onOpenReceipt: () => void;
}

let lastTabIndex: number | null = null;

export const Navbar: React.FC<Props> = ({
  currentPage,
  onNavigate,
  user,
  onLogout,
  onOpenAuth,
  onOpenReceipt,
}) => {
  const isCampaignsActive = currentPage === "campaigns";
  const isLedgerActive = currentPage === "ledger";
  const isProfileActive = currentPage === "profile";

  const activeIndex = isCampaignsActive ? 0 : isLedgerActive ? 1 : isProfileActive ? 2 : -1;

  const [slideIndex, setSlideIndex] = useState<number>(() =>
    lastTabIndex !== null && activeIndex !== -1 ? lastTabIndex : activeIndex
  );

  useEffect(() => {
    if (activeIndex === -1) return;
    lastTabIndex = activeIndex;

    if (slideIndex !== activeIndex) {
      const frame = requestAnimationFrame(() => {
        setSlideIndex(activeIndex);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [activeIndex, slideIndex]);

  return (
    <header className="nav cpn-unified">
      <div
        className="logo"
        onClick={() => onNavigate("campaigns")}
        role="button"
        tabIndex={0}
      >
        <img
          src="/amanah-logo.svg"
          alt="Amanah"
          className="brand-logo"
        />
        <span>Amanah</span>
      </div>

      <nav className="tabs" aria-label="Main navigation">
        {slideIndex >= 0 && (
          <span
            className="tab-glider"
            aria-hidden="true"
            style={{
              transform: `translate3d(${slideIndex * 100}%, 0, 0)`,
            }}
          />
        )}

        <button
          type="button"
          className="nb"
          data-on={isCampaignsActive ? "1" : undefined}
          onClick={() => onNavigate("campaigns")}
        >
          Explore
        </button>
        <button
          type="button"
          className="nb"
          data-on={isLedgerActive ? "1" : undefined}
          onClick={() => onNavigate("ledger")}
        >
          Ledger
        </button>
        <button
          type="button"
          className="nb"
          data-on={isProfileActive ? "1" : undefined}
          onClick={() => {
            if (user) {
              onNavigate("profile");
            } else {
              onOpenAuth("login");
            }
          }}
        >
          Profile
        </button>
      </nav>

      <div className="right">
        <button
          type="button"
          className="scan"
          onClick={onOpenReceipt}
          title="Verify receipt on Hedera HCS"
        >
          <span className="qr">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3M21 14v7h-4" />
            </svg>
            <i />
          </span>
          <span>Scan</span>
        </button>

        {user ? (
          <button
            type="button"
            className="ex"
            onClick={onLogout}
            aria-label="Log out"
            title={`Logged in as ${user.email} (Click to log out)`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="btn sec"
            onClick={() => onOpenAuth("login")}
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
};