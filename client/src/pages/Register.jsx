import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../apis/loginWithGoogle";
import PreAuthHeader from "../components/PreAuthHeader";
import { GithubLogin } from "../components/GithubLogin";
import { loginWithGithub } from "../apis/loginWithGithub";
import { sendOtp, verifyOtp } from "../apis/authApi";
import { registerUser } from "../apis/userApi";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [serverError, setServerError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Simple email validation
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      setServerError("");
      setOtpError("");
      setEmailError("");
      setOtpSent(false);
      setOtpVerified(false);
      setCountdown(0);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Send OTP handler
  const handleSendOtp = async () => {
    const { email } = formData;
    if (!email) {
      setEmailError("Please enter your email first.");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");

    try {
      setIsSending(true);
      await sendOtp(email);
      setOtpSent(true);
      setCountdown(60); // allow resend after 60s
      setServerError("");
      setOtpError("");
    } catch (err) {
      console.error(err);
      const errorMsg = err.message;
      if (errorMsg && errorMsg.toLowerCase().includes("email")) {
        setServerError(errorMsg);
        setOtpError("");
      } else {
        setOtpError(errorMsg || "Failed to send OTP.");
        setServerError("");
      }
    } finally {
      setIsSending(false);
    }
  };

  // Verify OTP handler
  const handleVerifyOtp = async () => {
    const { email } = formData;
    if (!otp) {
      setOtpError("Please enter OTP.");
      return;
    }

    try {
      setIsVerifying(true);
      await verifyOtp(email, otp);
      setOtpVerified(true);
      setOtpError("");
      setCountdown(0);
    } catch (err) {
      console.error(err);
      setOtpError(err.message || "Invalid or expired OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Final form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setIsSuccess(false);

    if (!otpVerified) {
      setOtpError("Please verify your email with OTP before registering.");
      return;
    }

    try {
      await registerUser(formData);
      setIsSuccess(true);
      setTimeout(() => navigate("/app"), 2000);
    } catch (error) {
      console.error(error);
      setServerError(
        error.message || "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <div className="auth-page">
      <PreAuthHeader />

      {/* Ambient glow for dark mode */}
      <div className="ambient-glow" />

      <div className="auth-container">
        {/* Brand */}
        <div className="brand-container">
          <div className="brand">
            <div className="brand-dot" />
            FileShelter
          </div>
        </div>

        {/* Form Header */}
        <div className="form-header">
          <h2 className="form-title">Create Account</h2>
          <p className="form-subtitle">All your files. One secure place.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="auth-input-group">
            <label htmlFor="name" className="auth-input-label">
              Full Name
            </label>
            <input
              className="auth-input-field"
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email + Send OTP */}
          <div className="auth-input-group" style={{ position: "relative" }}>
            <label htmlFor="email" className="auth-input-label">
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <input
                className={`auth-input-field has-action`}
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
              <button
                type="button"
                className="inline-action-btn"
                onClick={handleSendOtp}
                disabled={isSending || countdown > 0 || otpVerified}
              >
                {isSending
                  ? "Sending..."
                  : countdown > 0
                    ? `${countdown}s`
                    : "Send OTP"}
              </button>
            </div>
            {emailError && (
              <span className="auth-error-text">{emailError}</span>
            )}
            {serverError && (
              <span className="auth-error-text">{serverError}</span>
            )}
          </div>

          {/* OTP Input + Verify */}
          {otpSent && (
            <div className="auth-input-group" style={{ position: "relative" }}>
              <label htmlFor="otp" className="auth-input-label">
                Enter OTP
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="auth-input-field has-action"
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="4-digit OTP"
                  maxLength={4}
                  required
                />
                {otpVerified ? (
                  <span className="otp-verified-badge">Verified</span>
                ) : (
                  <button
                    type="button"
                    className="inline-action-btn"
                    onClick={handleVerifyOtp}
                    disabled={isVerifying}
                  >
                    {isVerifying ? "Verifying..." : "Verify OTP"}
                  </button>
                )}
              </div>
              {otpError && <span className="auth-error-text">{otpError}</span>}
            </div>
          )}

          {/* Password */}
          <div className="auth-input-group">
            <label htmlFor="password" className="auth-input-label">
              Password
            </label>
            <input
              className="auth-input-field"
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className={`auth-submit-btn ${isSuccess ? "success" : ""}`}
          >
            {isSuccess ? "Registration Successful" : "Sign Up"}
          </button>
        </form>

        <div className="social-divider">OR CONTINUE WITH</div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              const data = await loginWithGoogle(credentialResponse.credential);
              if (data.error) {
                console.log(data);
                return;
              }
              navigate("/app");
            }}
            onError={() => {
              console.log("Login Failed");
            }}
            useOneTap
            theme="outline"
            width={300}
            shape="pill"
            logo_alignment="center"
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "10px",
          }}
        >
          <GithubLogin
            onSuccess={async (code) => {
              try {
                const data = await loginWithGithub(code);
                if (data.error) {
                  setServerError(data.error);
                } else {
                  navigate("/app");
                }
              } catch (error) {
                console.error("GitHub Login Error:", error);
                setServerError("Something went wrong with GitHub login.");
              }
            }}
            onError={() => {
              setServerError("GitHub login failed.");
            }}
          />
        </div>

        <div className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
