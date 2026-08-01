import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { fetchUser, updatePassword } from "../apis/userApi";

function Profile() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const data = await fetchUser();
        if (!active) return;
        setUser(data);
      } catch (error) {
        if (!active) return;
        if (error.message === "Unauthorized") {
          navigate("/login");
          return;
        }
        setErrorMessage(error.message || "Failed to load profile.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [navigate]);

  const authProviders = Array.isArray(user?.authProviders)
    ? user.authProviders
    : [];
  const hasPassword = Boolean(user?.hasPassword);
  const isSocialAccount = authProviders.some((provider) => provider !== "local");
  const needsCurrentPassword = hasPassword;
  const title = hasPassword ? "Change password" : "Set password";
  const subtitle = hasPassword
    ? "Update the password tied to this account."
    : "Add a password so you can use email and password sign-in too.";

  const profileBadges = [];

  if (authProviders.includes("google")) {
    profileBadges.push("Google");
  }
  if (authProviders.includes("github")) {
    profileBadges.push("GitHub");
  }
  if (authProviders.includes("local")) {
    profileBadges.push("Email/password");
  }

  if (profileBadges.length === 0) {
    profileBadges.push("Unknown");
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (needsCurrentPassword && !formData.currentPassword) {
      setErrorMessage("Current password is required.");
      return;
    }

    try {
      setSaving(true);
      const response = await updatePassword(formData);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              hasPassword: true,
              authProviders: response.authProviders || prev.authProviders,
            }
          : prev,
      );
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccessMessage(response.message || "Password updated successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-container profile-shell">
      <div
        className={`sidebar-overlay${sidebarOpen ? " sidebar-overlay-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        disabled={false}
        role={user?.role || null}
        usedStorage={user?.usedStorage || 0}
        maxStorage={user?.maxStorage || 0}
        storageLoading={loading}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <TopBar
          searchPlaceholder="Search settings..."
          hideUpload={true}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <div className="content-scroll profile-content-scroll">
          <div className="profile-hero">
            <div>
              <p className="profile-eyebrow">Account security</p>
              <h1 className="profile-title">{title}</h1>
              <p className="profile-subtitle">{subtitle}</p>
            </div>

            <button
              type="button"
              className="profile-back-btn"
              onClick={() => navigate("/app")}
            >
              Back to files
            </button>
          </div>

          {errorMessage && <div className="error-banner">{errorMessage}</div>}

          <div className="profile-grid">
            <section className="profile-card profile-summary-card">
              <div className="profile-avatar">
                {user?.picture ? (
                  <img src={user.picture} alt={user?.name || "Profile"} />
                ) : (
                  <span>{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                )}
              </div>

              <div className="profile-summary-text">
                <h2>{user?.name || "Account"}</h2>
                <p>{user?.email || "Loading account..."}</p>
              </div>

              <div className="profile-badge-list">
                {profileBadges.map((badge) => (
                  <span key={badge} className="profile-badge">
                    {badge}
                  </span>
                ))}
              </div>

              <div className="profile-meta-grid">
                <div>
                  <span className="profile-meta-label">Password status</span>
                  <strong>{hasPassword ? "Set" : "Not set"}</strong>
                </div>
                <div>
                  <span className="profile-meta-label">Connected login</span>
                  <strong>{isSocialAccount ? "Social account" : "Local account"}</strong>
                </div>
              </div>
            </section>

            <section className="profile-card profile-form-card">
              <div className="profile-card-header">
                <div>
                  <h2>Security settings</h2>
                  <p>
                    {hasPassword
                      ? "Use this form to update your password."
                      : "Create a password for direct email login."}
                  </p>
                </div>
              </div>

              <form className="profile-form" onSubmit={handleSubmit}>
                {needsCurrentPassword && (
                  <div className="auth-input-group">
                    <label htmlFor="currentPassword" className="auth-input-label">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      className="auth-input-field"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="Enter current password"
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="auth-input-group">
                  <label htmlFor="newPassword" className="auth-input-label">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className="auth-input-field"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter a new password"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="confirmPassword" className="auth-input-label">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="auth-input-field"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm the new password"
                    required
                    disabled={loading}
                  />
                </div>

                <p className="profile-note">
                  {isSocialAccount
                    ? "Once saved, this password can be used to log in with your email address."
                    : "This will replace the password currently used for email login."}
                </p>

                {successMessage && (
                  <div className="profile-success">{successMessage}</div>
                )}

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-secondary-btn"
                    onClick={() => navigate("/app")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={saving || loading}
                  >
                    {saving ? "Saving..." : "Save password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
