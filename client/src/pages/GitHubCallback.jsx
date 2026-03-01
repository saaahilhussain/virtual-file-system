import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginWithGithub } from "../apis/loginWithGithub";

const GitHubCallback = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGitHubCallback = async () => {
      // 1. Get the 'code' from the URL query params
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get("code");

      if (!code) {
        setError("No authorization code found in URL.");
        return;
      }

      try {
        // 2. Send the code to our backend to complete login
        const data = await loginWithGithub(code);

        if (data.error) {
          setError(data.error);
        } else {
          // 3. Success! Navigate to home (dashboard)
          navigate("/");
        }
      } catch (err) {
        console.error("GitHub Login Error:", err);
        setError("Something went wrong during GitHub login.");
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
