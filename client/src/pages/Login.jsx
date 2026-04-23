import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../apis/loginWithGoogle";
import PreAuthHeader from "../components/PreAuthHeader";
import { GithubLogin } from "../components/GithubLogin";
import { loginWithGithub } from "../apis/loginWithGithub";
import { loginUser } from "../apis/userApi";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "sahilhussainofficial@gmail.com",
    password: "sahil123",
  });

  // serverError will hold the error message from the server
  const [serverError, setServerError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/app";
  const loginNotice = location.state?.notice || "";

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
      await loginUser(formData);
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Error:", error);
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
          <h2 className="form-title">Welcome Back</h2>
          <p className="form-subtitle">
            Enter your details to access your vault.
          </p>
          {loginNotice ? (
            <p
              style={{
                marginTop: "10px",
                color: "#b45309",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {loginNotice}
            </p>
          ) : null}
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
            Login
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
              navigate(from, { replace: true });
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
                  navigate(from, { replace: true });
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
          New to FileShelter? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
