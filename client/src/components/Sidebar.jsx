import { Link, useLocation } from "react-router-dom";

function Sidebar({
  onCreateFolderClick,
  onUploadFilesClick,
  disabled = false,
}) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-dot"></div>
        FileShelter
      </div>

      <div className="nav-group">
        {/* Quick Actions */}
        <div className="nav-quick-actions">
          <a
            href="#"
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              if (!disabled) onCreateFolderClick();
            }}
            style={{
              opacity: disabled ? 0.5 : 1,
              pointerEvents: disabled ? "none" : "auto",
            }}
          >
            <div
              className="nav-action-icon"
              style={{ background: "#F5F5F5", color: "#999" }}
            >
              <svg
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5.5 1v9m4.5-4.5H1" />
              </svg>
            </div>
            New Folder
          </a>
          <a
            href="#"
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              if (!disabled) onUploadFilesClick();
            }}
            style={{
              opacity: disabled ? 0.5 : 1,
              pointerEvents: disabled ? "none" : "auto",
            }}
          >
            <div
              className="nav-action-icon"
              style={{ background: "#F0F4FF", color: "#5C6BC0" }}
            >
              <svg
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2 7v2a2 2 0 001 2h5a2 2 0 001-2V7M5.5 1v6M4 4l1.5-1.5L7 4"
                />
              </svg>
            </div>
            Upload
          </a>
        </div>

        {/* Navigation */}
        <Link
          to="/"
          className={`nav-item ${pathname === "/" || pathname.startsWith("/directory") ? "active" : ""}`}
        >
          <svg
            className="nav-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          My Files
        </Link>
        <a href="#" className="nav-item">
          <svg
            className="nav-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          Starred
        </a>
        <a href="#" className="nav-item">
          <svg
            className="nav-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Recent
        </a>
        <Link
          to="/trash"
          className={`nav-item ${pathname === "/trash" ? "active" : ""}`}
        >
          <svg
            className="nav-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Trash
        </Link>
      </div>

      {/* Storage Widget */}
      <div className="storage-widget">
        <div className="storage-aura"></div>
        <div className="storage-title">Storage</div>
        <div className="storage-bar">
          <div className="storage-fill"></div>
        </div>
        <div className="storage-meta">
          <span>750 GB Used</span>
          <span>1 TB</span>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
