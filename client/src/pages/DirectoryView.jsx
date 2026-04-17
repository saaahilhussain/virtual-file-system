import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import CreateDirectoryModal from "../components/CreateDirectoryModal";
import RenameModal from "../components/RenameModal";
import DirectoryList from "../components/DirectoryList";
import Breadcrumb from "../components/Breadcrumb";
import {
  getDirectoryItems,
  createDirectory,
  renameDirectory,
  deleteDirectory,
} from "../apis/directoryApi";
import { deleteFile, renameFile, uploadInitiate } from "../apis/fileApi";
import { fetchUser } from "../apis/userApi";

function DirectoryView() {
  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;
  const { dirId } = useParams();
  const navigate = useNavigate();

  const [directoryName, setDirectoryName] = useState("My Drive");

  // Breadcrumb trail
  const [breadcrumbTrail, setBreadcrumbTrail] = useState([
    { id: null, name: "All Files" },
  ]);

  // Lists of items
  const [directoriesList, setDirectoriesList] = useState([]);
  const [filesList, setFilesList] = useState([]);

  // Error state
  const [errorMessage, setErrorMessage] = useState("");

  // User + storage state for sidebar
  const [sidebarUser, setSidebarUser] = useState({
    role: null,
    usedStorage: 0,
    maxStorage: 0,
  });
  const [storageLoading, setStorageLoading] = useState(true);

  // Modal states
  const [showCreateDirModal, setShowCreateDirModal] = useState(false);
  const [newDirname, setNewDirname] = useState("New Folder");

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameType, setRenameType] = useState(null); // "directory" or "file"
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Uploading states
  const fileInputRef = useRef(null);
  const [uploadXhrMap, setUploadXhrMap] = useState({}); // track XHR per item
  const [progressMap, setProgressMap] = useState({}); // track progress per item
  const [isUploading, setIsUploading] = useState(false); // indicates if an upload is in progress

  // Context menu
  const [activeContextMenu, setActiveContextMenu] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  /**
   * Fetch directory contents
   */
  async function getDirectoryItemsHandler() {
    setErrorMessage(""); // clear any existing error
    try {
      const data = await getDirectoryItems(dirId);

      // Set directory name
      setDirectoryName(dirId ? data.name : "My Drive");

      setBreadcrumbTrail(
        Array.isArray(data.breadcrumbTrail) && data.breadcrumbTrail.length > 0
          ? data.breadcrumbTrail
          : [{ id: null, name: "All Files" }],
      );

      // Reverse directories and files so new items show on top
      setDirectoriesList([...data.directories].reverse());
      setFilesList([...data.files].reverse());
    } catch (error) {
      if (error.message === "Unauthorized") {
        navigate("/login");
      } else {
        setErrorMessage(error.message);
      }
    }
  }

  async function getUserStorageInfo() {
    setStorageLoading(true);
    try {
      const user = await fetchUser();
      setSidebarUser({
        role: user.role || null,
        usedStorage: Number(user.usedStorage) || 0,
        maxStorage: Number(user.maxStorage) || 0,
      });
    } catch (error) {
      if (error.message === "Unauthorized") {
        navigate("/login");
      }
      // Keep sidebar with safe fallback values if user fetch fails.
    } finally {
      setStorageLoading(false);
    }
  }

  useEffect(() => {
    getDirectoryItemsHandler();
    getUserStorageInfo();
    // Reset context menu
    setActiveContextMenu(null);
  }, [dirId]);

  /**
   * Decide file icon
   */
  function getFileIcon(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    switch (ext) {
      case "pdf":
        return "pdf";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
        return "image";
      case "mp4":
      case "mov":
      case "avi":
        return "video";
      case "zip":
      case "rar":
      case "tar":
      case "gz":
        return "archive";
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "html":
      case "css":
      case "py":
      case "java":
        return "code";
      default:
        return "alt";
    }
  }

  /**
   * Click row to open directory or file
   */
  function handleRowClick(type, id) {
    if (type === "directory") {
      navigate(`/app/directory/${id}`);
    } else {
      window.location.href = `${import.meta.env.VITE_BACKEND_BASE_URI}/file/${id}`;
    }
  }

  /**
   * Select a file and start upload
   */
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (isUploading) {
      setErrorMessage("An upload is already in progress, please wait");
      setTimeout(() => setErrorMessage(""), 3000);
      e.target.value = "";
      return;
    }

    // Build a single temp item
    const tempItem = {
      file,
      name: file.name,
      size: file.size,
      id: `temp-${Date.now()}-${Math.random()}`,
      isUploading: false,
    };

    const uploadUrl = await uploadInitiate({
      name: file.name,
      size: file.size,
      contentType: file.type,
      parentDirId: dirId,
    });

    // const { uploadUrl } = data;

    // Add it to the top of the existing list
    setFilesList((prev) => [tempItem, ...prev]);

    // Clear file input so the same file can be chosen again if needed
    e.target.value = "";

    // Start uploading
    setIsUploading(true);
    startFileUpload(tempItem, uploadUrl);
  }

  /**
   * Upload a single file
   */
  function startFileUpload(item, uploadUrl) {
    // Mark it as isUploading: true
    setFilesList((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, isUploading: true } : f)),
    );

    // Start upload
    const xhr = new XMLHttpRequest();
    xhr.open(
      "PUT",
      // `${import.meta.env.VITE_BACKEND_BASE_URI}/file/${dirId || ""}`,
      uploadUrl,
      // true,
    );
    // xhr.withCredentials = true;
    // xhr.setRequestHeader("filename", item.name);
    // xhr.setRequestHeader("filesize", item.size);

    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable) {
        const progress = (evt.loaded / evt.total) * 100;
        setProgressMap((prev) => ({ ...prev, [item.id]: progress }));
      }
    });

    xhr.addEventListener("load", () => {
      // Upload complete
      setIsUploading(false);
      setTimeout(() => {
        getDirectoryItemsHandler();
        getUserStorageInfo();
      }, 1000);
    });

    // Store XHR for potential cancellation
    setUploadXhrMap((prev) => ({ ...prev, [item.id]: xhr }));
    xhr.send(item.file);
  }

  /**
   * Cancel an in-progress upload
   */
  function handleCancelUpload(tempId) {
    const xhr = uploadXhrMap[tempId];
    if (xhr) {
      xhr.abort();
    }

    // Remove from filesList
    setFilesList((prev) => prev.filter((f) => f.id !== tempId));

    // Remove from progressMap
    setProgressMap((prev) => {
      const { [tempId]: _, ...rest } = prev;
      return rest;
    });

    // Remove from upload map
    setUploadXhrMap((prev) => {
      const copy = { ...prev };
      delete copy[tempId];
      return copy;
    });

    // Reset uploading state
    setIsUploading(false);
  }

  /**
   * Delete a file/directory
   */
  async function handleDeleteFile(id) {
    setErrorMessage("");
    try {
      await deleteFile(id);
      getDirectoryItemsHandler();
      getUserStorageInfo();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleDeleteDirectory(id) {
    setErrorMessage("");
    try {
      await deleteDirectory(id);
      getDirectoryItemsHandler();
      getUserStorageInfo();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  /**
   * Create a directory
   */
  async function handleCreateDirectory(e) {
    e.preventDefault();
    setErrorMessage("");
    try {
      await createDirectory(dirId || "", newDirname);
      setNewDirname("New Folder");
      setShowCreateDirModal(false);
      getDirectoryItemsHandler();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  /**
   * Rename
   */
  function openRenameModal(type, id, currentName) {
    setRenameType(type);
    setRenameId(id);
    setRenameValue(currentName);
    setShowRenameModal(true);
  }

  async function handleRenameSubmit(e) {
    e.preventDefault();
    setErrorMessage("");
    try {
      if (renameType === "file") {
        await renameFile(renameId, renameValue);
      } else {
        await renameDirectory(renameId, renameValue);
      }

      setShowRenameModal(false);
      setRenameValue("");
      setRenameType(null);
      setRenameId(null);
      getDirectoryItemsHandler();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  /**
   * Context Menu
   */
  function handleContextMenu(e, id) {
    e.stopPropagation();
    e.preventDefault();
    const clickX = e.clientX;
    const clickY = e.clientY;

    if (activeContextMenu === id) {
      setActiveContextMenu(null);
    } else {
      setActiveContextMenu(id);
      setContextMenuPos({ x: (clickX - 110) / 0.8, y: clickY / 0.8 });
    }
  }

  useEffect(() => {
    function handleDocumentClick() {
      setActiveContextMenu(null);
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // Combine directories & files into one list for rendering
  const currentPathParts = breadcrumbTrail
    .slice(1)
    .map((entry) => entry.name)
    .filter(Boolean);
  const currentPath =
    currentPathParts.length > 0 ? `/${currentPathParts.join("/")}` : "/";

  function buildItemPath(name) {
    if (!name) return currentPath;
    return currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
  }

  const combinedItems = [
    ...directoriesList.map((d) => ({
      ...d,
      isDirectory: true,
      pathDisplay: buildItemPath(d.name),
    })),
    ...filesList.map((f) => ({
      ...f,
      isDirectory: false,
      pathDisplay: buildItemPath(f.name),
    })),
  ];

  const isAccessError =
    errorMessage === "Directory not found or you do not have access to it!";

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        onCreateFolderClick={() => setShowCreateDirModal(true)}
        onUploadFilesClick={() => fileInputRef.current.click()}
        disabled={isAccessError}
        role={sidebarUser.role}
        usedStorage={sidebarUser.usedStorage}
        maxStorage={sidebarUser.maxStorage}
        storageLoading={storageLoading}
      />

      {/* Main Content */}
      <div className="main-content">
        <TopBar
          onUploadFilesClick={() => fileInputRef.current.click()}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
        />

        <div className="content-scroll">
          {/* Error message (non-access errors) */}
          {errorMessage && !isAccessError && (
            <div className="error-banner">{errorMessage}</div>
          )}

          {/* Section Header */}
          <div className="section-header">
            <Breadcrumb trail={breadcrumbTrail} />
            <div className="section-header-actions">
              <div className="sort-label">Sort by: Date Modified</div>
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

          {/* Create Directory Modal */}
          {showCreateDirModal && (
            <CreateDirectoryModal
              newDirname={newDirname}
              setNewDirname={setNewDirname}
              onClose={() => setShowCreateDirModal(false)}
              onCreateDirectory={handleCreateDirectory}
            />
          )}

          {/* Rename Modal */}
          {showRenameModal && (
            <RenameModal
              renameType={renameType}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onClose={() => setShowRenameModal(false)}
              onRenameSubmit={handleRenameSubmit}
            />
          )}

          {combinedItems.length === 0 ? (
            isAccessError ? (
              <p className="empty-state-text">
                Directory not found or you do not have access to it!
              </p>
            ) : (
              <p className="empty-state-text">
                This folder is empty. Upload files or create a folder to see
                some data.
              </p>
            )
          ) : (
            <DirectoryList
              items={combinedItems}
              handleRowClick={handleRowClick}
              activeContextMenu={activeContextMenu}
              contextMenuPos={contextMenuPos}
              handleContextMenu={handleContextMenu}
              getFileIcon={getFileIcon}
              isUploading={isUploading}
              progressMap={progressMap}
              handleCancelUpload={handleCancelUpload}
              handleDeleteFile={handleDeleteFile}
              handleDeleteDirectory={handleDeleteDirectory}
              openRenameModal={openRenameModal}
              BASE_URL={BASE_URL}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DirectoryView;
