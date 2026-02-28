function TrashContextMenu({
  item,
  contextMenuPos,
  handleRestore,
  handlePermanentlyDelete,
}) {
  return (
    <div
      className="context-menu open"
      style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
    >
      <div
        className="context-menu-item"
        onClick={() =>
          handleRestore(item.isDirectory ? "directory" : "file", item.id)
        }
      >
        <svg
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M3 11a9 9 0 0 1 18 0" />
          <path d="m3 11 4-4" />
          <path d="m3 11 4 4" />
        </svg>
        Restore
      </div>
      <div className="context-menu-divider"></div>
      <div
        className="context-menu-item danger"
        onClick={() =>
          handlePermanentlyDelete(
            item.isDirectory ? "directory" : "file",
            item.id,
          )
        }
      >
        <svg
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        Delete Forever
      </div>
    </div>
  );
}

export default TrashContextMenu;
