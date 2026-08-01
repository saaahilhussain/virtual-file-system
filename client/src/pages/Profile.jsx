import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import {
  fetchUser,
  fetchSessions,
  logoutAllSessions,
  revokeSession,
  updatePassword,
} from "../apis/userApi";
import { getMySubscription } from "../apis/subscriptionApi";

const PROVIDER_DETAILS = {
  local: {
    label: "Email & password",
    mark: "@",
    description: "Use your email address and password to sign in.",
  },
  google: {
    label: "Google",
    mark: "G",
    description: "Connected Google account.",
  },
  github: {
    label: "GitHub",
    mark: "GH",
    description: "Connected GitHub account.",
  },
};

const PLAN_NAMES = {
  [import.meta.env.VITE_RZP_PLAN_PRO_MONTHLY]: "Pro",
  [import.meta.env.VITE_RZP_PLAN_PRO_YEARLY]: "Pro",
  [import.meta.env.VITE_RZP_PLAN_PREMIUM_MONTHLY]: "Premium",
  [import.meta.env.VITE_RZP_PLAN_PREMIUM_YEARLY]: "Premium",
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 GB";
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  return `${(bytes / 1024 ** 3).toFixed(0)} GB`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function Profile() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
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
        const [data, sessionsData, subscriptionData] = await Promise.all([
          fetchUser(),
          fetchSessions(),
          getMySubscription(),
        ]);
        if (active) {
          setUser(data);
          setSessions(sessionsData.sessions || []);
          setSubscription(subscriptionData.subscription || null);
        }
      } catch (error) {
        if (!active) return;
        if (error.message === "Unauthorized") {
          navigate("/login");
          return;
        }
        setErrorMessage(error.message || "Failed to load account settings.");
      } finally {
        if (active) {
          setLoading(false);
          setSessionsLoading(false);
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
  const passwordActionLabel = hasPassword ? "Change password" : "Set password";
  const connectedProviders = authProviders
    .filter((provider) => PROVIDER_DETAILS[provider])
    .map((provider) => ({ id: provider, ...PROVIDER_DETAILS[provider] }));
  const planName = subscription ? PLAN_NAMES[subscription.planId] || "Paid plan" : "Free";
  const planStatus = subscription?.status || "active";
  const renewalDate = formatDate(subscription?.chargeAt || subscription?.currentEnd);

  const resetPasswordForm = () => {
    setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const openPasswordForm = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setShowPasswordForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage("");
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (hasPassword && !formData.currentPassword) {
      setErrorMessage("Current password is required.");
      return;
    }

    try {
      setSaving(true);
      const response = await updatePassword(formData);
      setUser((previous) =>
        previous
          ? {
              ...previous,
              hasPassword: true,
              authProviders: response.authProviders || previous.authProviders,
            }
          : previous,
      );
      resetPasswordForm();
      setShowPasswordForm(false);
      setSuccessMessage(response.message || "Password updated successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      setSigningOut(true);
      await logoutAllSessions();
      navigate("/login");
    } catch (error) {
      setShowSignOutConfirm(false);
      setErrorMessage(error.message || "Failed to sign out of all devices.");
    } finally {
      setSigningOut(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      setRevokingSessionId(sessionId);
      await revokeSession(sessionId);
      setSessions((previous) => previous.filter((session) => session.id !== sessionId));
    } catch (error) {
      setErrorMessage(error.message || "Failed to sign out this device.");
    } finally {
      setRevokingSessionId(null);
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
          onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
        />

        <div className="content-scroll account-settings-content">
          <div className="account-settings-hero">
            <div>
              <p className="account-settings-eyebrow">Account settings</p>
              <h1>Profile & security</h1>
              <p>Manage how you sign in and keep your account secure.</p>
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
          {successMessage && (
            <div className="profile-success" role="status">
              {successMessage}
            </div>
          )}

          <div className="account-settings-stack">
            <section className="account-settings-card account-identity-card">
              <div className="account-section-heading">
                <div>
                  <p className="account-section-kicker">Account</p>
                  <h2>Your identity</h2>
                  <p>Your account details are used across File Shelter.</p>
                </div>
              </div>
              <div className="account-identity-body">
                <div className="profile-avatar account-identity-avatar">
                  {user?.picture ? (
                    <img src={user.picture} alt={user?.name || "Profile"} />
                  ) : (
                    <span>{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                  )}
                </div>
                <div>
                  <h3>{user?.name || "Your account"}</h3>
                  <p>{user?.email || "Loading account details..."}</p>
                </div>
              </div>
            </section>

            <section className="account-settings-card">
              <div className="account-section-heading">
                <div>
                  <p className="account-section-kicker">Access</p>
                  <h2>Sign-in methods</h2>
                  <p>These are the secure methods currently connected to your account.</p>
                </div>
              </div>
              <div className="account-provider-list">
                {connectedProviders.length ? (
                  connectedProviders.map((provider) => (
                    <div className="account-provider-row" key={provider.id}>
                      <span className={`account-provider-icon ${provider.id}`}>
                        {provider.mark}
                      </span>
                      <div className="account-provider-copy">
                        <strong>{provider.label}</strong>
                        <span>{provider.id === "local" && !hasPassword
                          ? "No password set yet."
                          : provider.description}</span>
                      </div>
                      <span className="account-status-pill">Connected</span>
                    </div>
                  ))
                ) : (
                  <p className="account-empty-state">No sign-in methods found.</p>
                )}
              </div>
            </section>

            <section className="account-settings-card account-plan-card">
              <div className="account-section-heading account-section-heading-action">
                <div>
                  <p className="account-section-kicker">Storage plan</p>
                  <h2>{planName}</h2>
                  <p>
                    {subscription
                      ? `${planStatus.charAt(0).toUpperCase()}${planStatus.slice(1)} subscription`
                      : "Your current free storage plan."}
                  </p>
                </div>
                <button
                  type="button"
                  className="profile-secondary-btn"
                  onClick={() => navigate("/plans")}
                >
                  Manage plan
                </button>
              </div>
              <div className="account-plan-stats">
                <div>
                  <span>Storage included</span>
                  <strong>{formatBytes(user?.maxStorage)}</strong>
                </div>
                <div>
                  <span>{subscription ? "Next billing" : "Plan status"}</span>
                  <strong>{renewalDate || (subscription ? "Not scheduled" : "Free plan")}</strong>
                </div>
              </div>
            </section>

            <section className="account-settings-card">
              <div className="account-section-heading account-section-heading-action">
                <div>
                  <p className="account-section-kicker">Security</p>
                  <h2>Password</h2>
                  <p>
                    {hasPassword
                      ? "Your email and password sign-in is ready to use."
                      : "Add a password to enable email and password sign-in."}
                  </p>
                </div>
                {!showPasswordForm && (
                  <button
                    type="button"
                    className="account-action-btn"
                    onClick={openPasswordForm}
                    disabled={loading}
                  >
                    {passwordActionLabel}
                  </button>
                )}
              </div>

              <div className="account-security-status">
                <span className="account-security-dot" aria-hidden="true" />
                <span>{hasPassword ? "Password set" : "Password not set"}</span>
              </div>

              {showPasswordForm && (
                <form className="profile-form account-password-form" onSubmit={handlePasswordSubmit}>
                  {hasPassword && (
                    <div className="auth-input-group">
                      <label htmlFor="currentPassword" className="auth-input-label">
                        Current password
                      </label>
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        className="auth-input-field"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        placeholder="Enter current password"
                        disabled={saving}
                        required
                      />
                    </div>
                  )}

                  <div className="auth-input-group">
                    <label htmlFor="newPassword" className="auth-input-label">
                      New password
                    </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      className="auth-input-field"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="At least 6 characters"
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="confirmPassword" className="auth-input-label">
                      Confirm new password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      className="auth-input-field"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat new password"
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="profile-form-actions">
                    <button
                      type="button"
                      className="profile-secondary-btn"
                      onClick={() => {
                        resetPasswordForm();
                        setShowPasswordForm(false);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="account-action-btn" disabled={saving}>
                      {saving ? "Saving..." : "Save password"}
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="account-settings-card account-session-card">
              <div className="account-section-heading account-section-heading-action">
                <div>
                  <p className="account-section-kicker">Sessions</p>
                  <h2>Sign out everywhere</h2>
                  <p>End this account’s active sessions on all devices, including this one.</p>
                </div>
                <button
                  type="button"
                  className="account-danger-btn"
                  onClick={() => setShowSignOutConfirm(true)}
                  disabled={loading}
                >
                  Sign out of all devices
                </button>
              </div>
              <div className="account-device-list">
                {sessionsLoading ? (
                  <p className="account-empty-state">Loading signed-in devices...</p>
                ) : sessions.length ? (
                  sessions.map((session) => (
                    <div className="account-device-row" key={session.id}>
                      <span className="account-device-icon" aria-hidden="true">▣</span>
                      <div className="account-device-copy">
                        <strong>
                          {session.device}
                          {session.isCurrent ? " · This device" : ""}
                        </strong>
                        <span>
                          {session.lastActiveAt
                            ? `Last active ${new Date(session.lastActiveAt).toLocaleString()}`
                            : "Active session"}
                        </span>
                      </div>
                      {!session.isCurrent && (
                        <button
                          type="button"
                          className="account-device-signout"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSessionId === session.id}
                        >
                          {revokingSessionId === session.id ? "Signing out..." : "Sign out"}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="account-empty-state">No active sessions found.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {showSignOutConfirm && (
        <div className="modal-overlay" onClick={signingOut ? undefined : () => setShowSignOutConfirm(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal-title">Sign out of all devices?</h2>
            <p className="account-confirm-copy">
              You will need to sign in again on every device where this account is active.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                disabled={signingOut}
                onClick={() => setShowSignOutConfirm(false)}
              >
                Keep me signed in
              </button>
              <button
                type="button"
                className="account-danger-btn"
                disabled={signingOut}
                onClick={handleLogoutAll}
              >
                {signingOut ? "Signing out..." : "Sign out everywhere"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
