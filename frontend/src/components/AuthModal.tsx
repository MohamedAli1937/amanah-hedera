import React, { useState } from "react";
import { api, login } from "../api";
import type { User } from "../types";

interface Props {
  mode: "login" | "register";
  onClose: () => void;
  onSuccess: (user: User) => void;
  onSwitchMode: (mode: "login" | "register") => void;
}

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "register") {
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
        setSuccess("Your NGO application was submitted. A moderator must approve it before you can sign in.");
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
    onSwitchMode(nextMode);
  }

  async function handleQuickDemoLogin() {
    setLoading(true);
    setError(null);
    try {
      await login("moderator@amanah.com", "Amanah123456!");
      const currentUser = await api<User>("/auth/me");
      onSuccess(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-card auth-modal-card ${mode === "register" ? "auth-register-card" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-button close-btn auth-close-button" onClick={onClose} aria-label="Close authentication dialog">
          ✕
        </button>
        <div className="auth-header">
          <div className="brand-logo-small">
            <img src="/amanah-logo.svg" alt="" className="auth-brand-icon" />
            <span className="brand-txt">Amanah</span>
          </div>
          <h2>{mode === "login" ? "Sign In to Amanah" : "Create your Account"}</h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Access your verified donation receipts and impact profile"
              : "Join transparent humanitarian aid anchored on Hedera HCS"}
          </p>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}
        {success && <div className="alert success" role="status">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="form-field-group">
              <label>NGO / Organization Name</label>
              <input
                type="text"
                placeholder="e.g. Hope Relief Organization"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          {mode === "register" && (
            <>
              <div className="form-field-group">
                <label>Phone number</label>
                <input
                  type="tel"
                  placeholder="e.g. +216 20 000 000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-group">
                <label>Registration document</label>
                <input
                  type="url"
                  placeholder="https://example.org/registration-document"
                  value={registrationDocument}
                  onChange={(e) => setRegistrationDocument(e.target.value)}
                  required
                />
                <span className="auth-field-help">Provide a link to the NGO registration or legal document.</span>
              </div>
            </>
          )}

          <div className="form-field-group">
            <label>Email address</label>
            <input
              type="email"
              placeholder="e.g. emasmith@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field-group">
            <label>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="At least 12 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>

          {mode === "register" && (
            <div className="form-field-group">
              <label>Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                minLength={12}
                required
              />
            </div>
          )}

          <label className="auth-checkbox-label">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Show password
          </label>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Submit NGO Application"}
          </button>

          {mode === "login" && <div className="demo-helper-row">
            <button
              type="button"
              className="btn-quick-demo"
              onClick={handleQuickDemoLogin}
            >
              ⚡ Quick Demo Sign In as Moderator
            </button>
          </div>}
        </form>

        <div className="auth-footer-toggle">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                className="link-switch"
                onClick={() => switchMode("register")}
              >
                Register
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button
                type="button"
                className="link-switch"
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
