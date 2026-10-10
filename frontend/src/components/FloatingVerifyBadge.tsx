import React from "react";

interface Props {
  onClick: () => void;
}

export const FloatingVerifyBadge: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      className="floating-verify-shield-btn"
      onClick={onClick}
      title="Quick Hedera Receipt Verification"
      aria-label="Quick Hedera Receipt Verification"
    >
      <div className="shield-icon-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shield-svg">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
    </button>
  );
};
