import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../apis/loginWithGoogle";

const Login = () => {
  const BASE_URL = "http://localhost:4000";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // serverError will hold the error message from the server
  const [serverError, setServerError] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clear the server error as soon as the user starts typing in either field
    if (serverError) {
      setServerError("");
    }

    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${BASE_URL}/user/login`, {
        method: "POST",
        body: JSON.stringify(formData),
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();
      if (data.error) {
        // If there's an error, set the serverError message
        setServerError(data.error);
      } else {
        // On success, navigate to home or any other protected route
        navigate("/");
      }
    } catch (error) {
      console.error("Error:", error);
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
          <h2 className="form-title">Welcome Back</h2>
          <p className="form-subtitle">
            Enter your details to access your vault.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="auth-input-group">
            <label htmlFor="email" className="auth-input-label">
              Email Address
            </label>
            <input
              className="auth-input-field"
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              required
            />
          </div>

          {/* Password */}
          <div className="auth-input-group" style={{ position: "relative" }}>
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
            {serverError && (
              <span className="auth-error-text">{serverError}</span>
            )}
          </div>

          <button type="submit" className="auth-submit-btn">
            Sign In
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
            theme="outline"
            width={300}
            shape="pill"
            logo_alignment="center"
          />
        </div>

        <div className="auth-footer-link">
          New to FileShelter? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
