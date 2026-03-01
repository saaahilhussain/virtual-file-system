import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginWithGithub } from "../apis/loginWithGithub";

const GitHubCallback = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGitHubCallback = () => {
      // 1. Get the 'code' from the URL query params
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get("code");

      if (!code) {
        setError("No authorization code found in URL.");
        return;
      }

      // 2. Send the code back to the parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: "GITHUB_AUTH_CODE", code },
          window.location.origin,
        );

        // 3. Close the popup
        window.close();
      } else {
        setError(
          "This page is meant to be opened as a popup for authentication.",
        );
      }
    };

    handleGitHubCallback();
  }, [location, navigate]);

  return (
    <div
      className="auth-page"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="ambient-glow" />
      <div className="auth-container" style={{ textAlign: "center" }}>
        <h2 className="form-title">Authenticating...</h2>
        {error ? (
          <p className="auth-error-text" style={{ marginTop: "1rem" }}>
            {error}
          </p>
        ) : (
          <p className="form-subtitle">
            Please wait while we log you in with GitHub.
          </p>
        )}
      </div>
    </div>
  );
};

export default GitHubCallback;
