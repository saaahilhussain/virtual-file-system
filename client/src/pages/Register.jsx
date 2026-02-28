import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../apis/loginWithGoogle";

const Register = () => {
  const BASE_URL = "http://localhost:4000";

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
      const res = await fetch(`${BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setCountdown(60); // allow resend after 60s
        setServerError("");
        setOtpError("");
      } else {
        if (data.error && data.error.toLowerCase().includes("email")) {
          setServerError(data.error);
          setOtpError("");
        } else {
          setOtpError(data.error || "Failed to send OTP.");
          setServerError("");
        }
      }
    } catch (err) {
      console.error(err);
      setOtpError("Something went wrong sending OTP.");
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
      const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (res.ok) {
        setOtpVerified(true);
        setOtpError("");
      } else {
        setOtpError(data.error || "Invalid or expired OTP.");
      }
    } catch (err) {
      console.error(err);
      setOtpError("Something went wrong verifying OTP.");
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
      const response = await fetch(`${BASE_URL}/user/register`, {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (data.error) {
        setServerError(data.error);
      } else {
        setIsSuccess(true);
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (error) {
      console.error(error);
      setServerError("Something went wrong. Please try again.");
    }
  };

  // Dark mode toggle
  const toggleDarkMode = () => {
    document.body.classList.toggle("dark-mode");
  };

  return (
    <div className="auth-page">
      {/* Theme Toggle */}
      <button
        className="theme-toggle"
        onClick={toggleDarkMode}
        title="Toggle dark mode"
        type="button"
      >
        <svg
          className="icon-sun"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg
          className="icon-moon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

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
              navigate("/");
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

        <div className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
