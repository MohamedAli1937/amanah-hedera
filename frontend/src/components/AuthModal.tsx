import React, { useState } from "react";
import { api, login } from "../api";
import type { User } from "../types";

interface Props {
  mode: "login" | "register";
  onClose: () => void;
  onSuccess: (user: User) => void;
  onSwitchMode: (mode: "login" | "register") => void;
}

const EyeToggleIcon: React.FC<{ visible: boolean }> = ({ visible }) =>
  visible ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

export const AuthModal: React.FC<Props> = ({
  mode,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationDocument, setRegistrationDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== passwordConfirmation) {
          throw new Error("Passwords do not match");
        }
        await api("/ngos/", {
          method: "POST",
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            password_confirmation: passwordConfirmation,
            phone_number: phoneNumber.trim() || null,
            registration_document: registrationDocument.trim() || null,
          }),
        });
        setSuccess(
          "Your NGO application was submitted. A moderator will review and approve it."
        );
        setPassword("");
        setPasswordConfirmation("");
        setPhoneNumber("");
        setRegistrationDocument("");
      } else {
        await login(email.trim().toLowerCase(), password);
        const currentUser = await api<User>("/auth/me");
        onSuccess(currentUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: "login" | "register") {
    setError(null);
    setSuccess(null);
    setPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    onSwitchMode(nextMode);
  }

  async function handleQuickDemoLogin(demoEmail: string) {
    setLoading(true);
    setError(null);
    try {
      await login(demoEmail, "Amanah123456!");
      const currentUser = await api<User>("/auth/me");
      onSuccess(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop-frosted" onClick={onClose}>
      <div
        className={`modal-card-frosted auth-modal ${
          isRegister ? "is-register" : "is-login"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-modal-top">
          <div>
            <h2 className="auth-modal-title">
              {isRegister ? "Register Organization" : "Sign in to Amanah"}
            </h2>
            <p className="auth-modal-sub">
              {isRegister
                ? "Apply for verified humanitarian aid recording on Hedera HCS"
                : "Access verified donations, NGO dashboard, and Hedera receipts"}
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <div className="auth-alert error">{error}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        <form
          onSubmit={handleSubmit}
          className={`auth-form-grid ${isRegister ? "two-col" : "one-col"}`}
        >
          {isRegister && (
            <>
              <div className="auth-field">
                <label>Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hope Relief Foundation"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+216 20 000 000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="auth-field">
              <label>Registration Document URL</label>
              <input
                type="url"
                placeholder="https://example.org/license.pdf"
                value={registrationDocument}
                onChange={(e) => setRegistrationDocument(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Password</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <EyeToggleIcon visible={showPassword} />
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="auth-field">
              <label>Confirm Password</label>
              <div className="password-input-wrap">
                <input
                  type={showPasswordConfirmation ? "text" : "password"}
                  placeholder="Repeat password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() =>
                    setShowPasswordConfirmation((prev) => !prev)
                  }
                  aria-label={
                    showPasswordConfirmation
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  title={
                    showPasswordConfirmation
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <EyeToggleIcon visible={showPasswordConfirmation} />
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn am auth-submit full-width"
          >
            {loading
              ? "Authenticating..."
              : isRegister
              ? "Submit Application"
              : "Sign In"}
          </button>
        </form>

        {!isRegister && (
          <div className="auth-demo-box">
            <span className="auth-demo-label">Quick Demo Accounts</span>
            <div className="auth-demo-actions">
              <button
                type="button"
                className="btn sec"
                onClick={() => handleQuickDemoLogin("moderator@amanah.com")}
              >
                Moderator Demo
              </button>
              <button
                type="button"
                className="btn sec"
                onClick={() => handleQuickDemoLogin("contact@globalhope.org")}
              >
                NGO Admin Demo
              </button>
            </div>
          </div>
        )}

        <div className="auth-switch-footer">
          {!isRegister ? (
            <p>
              New humanitarian organization?{" "}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => switchMode("register")}
              >
                Apply for NGO Verification
              </button>
            </p>
          ) : (
            <p>
              Already verified?{" "}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};