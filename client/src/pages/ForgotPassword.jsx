import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import PreAuthHeader from "../components/PreAuthHeader";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordReset,
} from "../apis/authApi";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("request");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendCode = async () => {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await requestPasswordReset(email);
      setMessage(response.message);
      setStep("verify");
      setCountdown(60);
    } catch (err) {
      setError(err.message || "Unable to send a reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(otp)) {
      setError("Enter the six-digit code from your email.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await verifyPasswordReset(email, otp);
      setResetToken(response.resetToken);
      setMessage("Code verified. Choose a new password.");
      setStep("password");
    } catch (err) {
      setError(err.message || "The code is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await completePasswordReset({
        email,
        resetToken,
        newPassword,
        confirmPassword,
      });
      navigate("/login", { state: { notice: response.message }, replace: true });
    } catch (err) {
      setError(err.message || "Unable to reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <PreAuthHeader />
      <div className="ambient-glow" />
      <div className="auth-container">
        <div className="brand-container">
          <BrandMark text="FileShelter" size={36} />
        </div>
        <div className="form-header">
          <h2 className="form-title">Reset your password</h2>
          <p className="form-subtitle">
            {step === "request"
              ? "We’ll send a verification code to your email."
              : step === "verify"
                ? "Enter the code we sent to your email."
                : "Create a new password for your account."}
          </p>
        </div>

        {step === "request" && (
          <form onSubmit={(event) => { event.preventDefault(); sendCode(); }}>
            <div className="auth-input-group">
              <label htmlFor="reset-email" className="auth-input-label">Email Address</label>
              <input className="auth-input-field" type="email" id="reset-email" value={email}
                onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Sending..." : "Send reset code"}
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerify}>
            <div className="auth-input-group">
              <label htmlFor="reset-otp" className="auth-input-label">Verification Code</label>
              <input className="auth-input-field" type="text" inputMode="numeric" id="reset-otp" value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code" maxLength={6} autoComplete="one-time-code" required />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Verifying..." : "Verify code"}
            </button>
            <button type="button" className="reset-link-button" onClick={sendCode}
              disabled={loading || countdown > 0}>
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleComplete}>
            <div className="auth-input-group">
              <label htmlFor="new-password" className="auth-input-label">New Password</label>
              <input className="auth-input-field" type="password" id="new-password" value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)} minLength={6} required />
            </div>
            <div className="auth-input-group">
              <label htmlFor="confirm-password" className="auth-input-label">Confirm New Password</label>
              <input className="auth-input-field" type="password" id="confirm-password" value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Saving..." : "Reset password"}
            </button>
          </form>
        )}

        {message && <p className="auth-notice-text">{message}</p>}
        {error && <p className="auth-error-text">{error}</p>}
        <div className="auth-footer-link">Remembered it? <Link to="/login">Sign In</Link></div>
      </div>
    </div>
  );
}
