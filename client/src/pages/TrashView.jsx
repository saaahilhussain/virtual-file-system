import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import TrashContextMenu from "../components/TrashContextMenu";

// Setup base URL
const BASE_URL = "http://localhost:4000";

function TrashView() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Context Menu State
  const [activeContextMenu, setActiveContextMenu] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const fetchTrashItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/trash`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch trash items");
      const data = await res.json();

      const { directories, files } = data;

      // Combine directories and files, adding type flag
      const combinedItems = [
        ...directories.map((d) => ({ ...d, isDirectory: true })),
        ...files.map((f) => ({ ...f, isDirectory: false })),
      ];

      setItems(combinedItems);
    } catch (error) {
      console.error("Error fetching trash items", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const handleContextMenu = (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    // The context menu is ~200px wide. Shift left to avoid right edge overflow.
    const menuWidth = 210;
    let x = e.clientX;
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    if (activeContextMenu === id) {
      setActiveContextMenu(null);
    } else {
      setActiveContextMenu(id);
      setContextMenuPos({ x, y: e.clientY });
    }
  };

  const closeContextMenu = () => {
    if (activeContextMenu) setActiveContextMenu(null);
  };

  useEffect(() => {
    window.addEventListener("click", closeContextMenu);
    return () => window.removeEventListener("click", closeContextMenu);
  });

  // --- Actions ---
  const handleRestore = async (type, id) => {
    try {
      const endpoint = type === "directory" ? "directory" : "file";
      const res = await fetch(`${BASE_URL}/${endpoint}/${id}/restore`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to restore item");

      // Remove item from UI
      setItems((prev) => prev.filter((item) => item.id !== id));
      closeContextMenu();
    } catch (error) {
      console.error("Error restoring item", error);
    }
  };

  const handlePermanentlyDelete = async (type, id) => {
    try {
      const endpoint = type === "directory" ? "directory" : "file";
      const res = await fetch(`${BASE_URL}/${endpoint}/${id}/permanent`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to permanently delete item");

      // Remove item from UI
      setItems((prev) => prev.filter((item) => item.id !== id));
      closeContextMenu();
    } catch (error) {
      console.error("Error deleting item permanently", error);
    }
  };

  const handleEmptyTrash = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete all items in the trash? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/trash`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to empty trash");
      setItems([]);
    } catch (error) {
      console.error("Error emptying trash", error);
    }
  };

  // Helper function reused from DirectoryItem for standard file badges
  function getFileTypeInfo(filename) {
    if (!filename) return { label: "File", badge: "FILE", typeClass: "" };
    const ext = filename.split(".").pop().toLowerCase();
    switch (ext) {
      case "png":
        return { label: "PNG Image", badge: "IMG", typeClass: "type-img" };
      case "jpg":
      case "jpeg":
        return { label: "JPEG Image", badge: "IMG", typeClass: "type-img" };
      case "gif":
        return { label: "GIF Image", badge: "IMG", typeClass: "type-img" };
      case "pdf":
        return { label: "PDF Document", badge: "PDF", typeClass: "type-doc" };
      case "doc":
      case "docx":
        return { label: "Word Doc", badge: "DOC", typeClass: "type-doc" };
      case "xls":
      case "xlsx":
        return { label: "Spreadsheet", badge: "XLS", typeClass: "type-xls" };
      case "mp4":
      case "mov":
      case "avi":
        return { label: "Video", badge: "VID", typeClass: "type-img" };
      case "zip":
      case "rar":
      case "tar":
      case "gz":
        return { label: "Archive", badge: "ZIP", typeClass: "type-doc" };
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "html":
      case "css":
      case "py":
      case "java":
        return { label: "Code", badge: "SRC", typeClass: "type-xls" };
      default:
        return { label: "File", badge: "FILE", typeClass: "" };
    }
  }

  return (
    <div className="app-container">
      <Sidebar disabled={true} />
      <main className="main-content">
        <TopBar />

        <div className="content-scroll">
          <div className="section-header">
            <h2 className="section-title">Trash</h2>
            <div className="section-header-actions">
              {items.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{
                    color: "#E53E3E",
                    borderColor: "#E53E3E",
                    padding: "8px 16px",
                    fontSize: "14px",
                    marginRight: "16px",
                  }}
                  onClick={handleEmptyTrash}
                >
                  Empty Trash
                </button>
              )}
              <div className="sort-label">Sort by: Date Deleted</div>
              <div className="view-mode-toggle">
                <button className="view-mode-btn active">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
                <button className="view-mode-btn">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state-text">Loading...</p>
          ) : items.length === 0 ? (
            <p className="empty-state-text">
              Trash is empty. Items moved to the trash will appear here.
            </p>
          ) : (
            <table className="files-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const typeInfo = item.isDirectory
                    ? { label: "Folder", badge: "DIR", typeClass: "type-xls" }
                    : getFileTypeInfo(item.name);

                  return (
                    <tr
                      key={item.id}
                      className="file-row"
                      onContextMenu={(e) => handleContextMenu(e, item.id)}
                    >
                      <td>
                        <div className="file-name-cell">
                          {item.isDirectory ? (
                            <div className="file-icon type-xls">
                              <svg
                                width="14"
                                height="14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className={`file-icon ${typeInfo.typeClass}`}>
                              {typeInfo.badge}
                            </div>
                          )}
                          <span
                            style={{
                              textDecoration: "line-through",
                              opacity: 0.7,
                            }}
                          >
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ opacity: 0.7 }}>
                        {item.isDirectory ? "—" : formatSize(item.size)}
                      </td>
                      <td style={{ opacity: 0.7 }}>{typeInfo.label}</td>
                      <td>
                        <button
                          className="row-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, item.id);
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                      </td>

                      {activeContextMenu === item.id && (
                        <TrashContextMenu
                          item={item}
                          contextMenuPos={contextMenuPos}
                          handleRestore={handleRestore}
                          handlePermanentlyDelete={handlePermanentlyDelete}
                        />
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );

  function formatSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }
}

export default TrashView;
