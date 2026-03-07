import { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

function UsersView() {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@fileshelter.app",
      isAdmin: true,
    },
    {
      id: 2,
      name: "Alex Miller",
      email: "a.miller@partner.com",
      isAdmin: false,
    },
    { id: 3, name: "David Kim", email: "david.k@designco.net", isAdmin: false },
    {
      id: 4,
      name: "Laura Rivera",
      email: "l.rivera@internal.io",
      isAdmin: false,
    },
    {
      id: 5,
      name: "Michael Wong",
      email: "m.wong@fileshelter.app",
      isAdmin: false,
    },
  ]);

  // Context Menu State for users, although here we just use inline buttons
  // but keeping it simple as per mockup
  const handleLogout = (userId) => {
    // In a real app this would send a trigger to backend, here we just show alert or console
    console.log(`Action: Logout user ${userId}`);
    alert(`Logged out user ${userId}`);
  };

  const handleDelete = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    }
  };

  return (
    <div className="app-container">
      <Sidebar disabled={false} />
      <main className="main-content">
        <TopBar searchPlaceholder="Search users..." hideUpload={true} />

        <div className="content-scroll">
          <div className="section-header">
            <h2
              className="section-title"
              style={{ fontSize: "24px", fontWeight: "600" }}
            >
              User Management
            </h2>
            <div className="section-header-actions">
              <button className="upload-btn" style={{ padding: "8px 20px" }}>
                + Add User
              </button>
            </div>
          </div>

          <table className="users-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: "16px" }}>NAME</th>
                <th style={{ textAlign: "center" }}>EMAIL ID</th>
                <th style={{ textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="user-row">
                  <td>
                    <div className="user-name-cell">
                      <div
                        className="user-img-fallback"
                        style={{
                          width: "36px",
                          height: "36px",
                          background: "var(--bg-canvas)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <span className="user-name-text">{user.name}</span>
                      {user.isAdmin && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </div>
                  </td>
                  <td
                    className="user-email-cell"
                    style={{ textAlign: "center" }}
                  >
                    {user.email}
                  </td>
                  <td>
                    <div className="user-actions">
                      <button
                        className="btn-logout"
                        onClick={() => handleLogout(user.id)}
                      >
                        Logout
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="empty-state-text">No users found.</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default UsersView;
