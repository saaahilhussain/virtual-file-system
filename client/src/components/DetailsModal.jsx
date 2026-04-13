import React from "react";

function DetailsModal({ item, onClose }) {
  if (!item) return null;
  const formatSize = (bytes = 0) => {
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (bytes >= GB) return (bytes / GB).toFixed(2) + " GB";
    if (bytes >= MB) return (bytes / MB).toFixed(2) + " MB";
    if (bytes >= KB) return (bytes / KB).toFixed(2) + " KB";
    return bytes + " B";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Details</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "16px",
            fontSize: "14px",
            color: "var(--text-primary)",
          }}
        >
          <div>
            <strong>Name:</strong> {item.name}
          </div>
          <div>
            <strong>Path:</strong> /
          </div>
          <div>
            <strong>Size:</strong> {formatSize(item.size)}
          </div>
          <div>
            <strong>Created At:</strong>{" "}
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "N/A"}
          </div>
          <div>
            <strong>Updated At:</strong>{" "}
            {item.updatedAt
              ? new Date(item.updatedAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "N/A"}
          </div>
        </div>
        <div
          className="modal-actions"
          style={{
            marginTop: "24px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="modal-btn modal-btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DetailsModal;
