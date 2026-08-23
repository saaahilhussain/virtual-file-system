import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import { getSharedItem } from "../apis/shareApi";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
];

function formatSize(bytes) {
  if (bytes == null) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Number(bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${Number.isInteger(size) ? size : size.toFixed(1)} ${units[unitIndex]}`;
}

function downloadUrl(token, fileId, mode) {
  const suffix = mode ? "?mode=preview" : "";
  return `${BASE_URL}/public/share/${token}/download/${fileId}${suffix}`;
}

function FolderIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ShareView() {
  const { token } = useParams();
  const [dirId, setDirId] = useState(null);
  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setData(null);
    setItems([]);
    setNextCursor(null);

    getSharedItem(token, dirId ? { dir: dirId } : {})
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setItems(res.items || []);
        setNextCursor(res.nextCursor || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError({ message: err.message, code: err.code });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, dirId]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const res = await getSharedItem(token, {
        dir: dirId || undefined,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...(res.items || [])]);
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      setError({ message: err.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const fileShare = data?.resourceType === "file" ? data.item : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-canvas)" }}>
      <header
        className="flex justify-between items-center px-10 py-5 box-border sticky top-0 z-50"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <BrandMark />
        <span style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
          Shared via File Shelter
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {loading && (
          <p style={{ color: "var(--text-tertiary)" }}>Loading…</p>
        )}

        {!loading && error && (
          <div className="text-center py-16 flex flex-col items-center gap-5">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {error.message}
            </h1>
            {error.code === "SIGN_IN_REQUIRED" && (
              <>
                <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
                  This link is restricted. Sign in with an allowed email address to continue.
                </p>
                <Link
                  to="/login"
                  className="px-7 py-3 rounded-full no-underline font-medium text-white"
                  style={{ background: "var(--accent-black)" }}
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 18 }}>
              Shared by <strong>{data.ownerName}</strong>
              {data.accessType === "restricted" && " · Restricted link"}
            </p>

            {fileShare && (
              <div
                className="rounded-2xl p-8 flex flex-col items-center gap-4"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
              >
                {IMAGE_EXTENSIONS.includes((fileShare.extension || "").toLowerCase()) && (
                  <img
                    src={downloadUrl(token, fileShare.id, "preview")}
                    alt={fileShare.name}
                    className="max-h-96 rounded-lg object-contain"
                  />
                )}
                <FileIcon />
                <h1
                  className="text-lg font-semibold text-center break-all"
                  style={{ color: "var(--text-primary)" }}
                >
                  {fileShare.name}
                </h1>
                <span style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
                  {formatSize(fileShare.size)}
                </span>
                <a
                  href={downloadUrl(token, fileShare.id)}
                  className="px-7 py-3 rounded-full no-underline font-medium text-white mt-2 inline-flex items-center gap-2"
                  style={{ background: "var(--accent-black)" }}
                >
                  Download
                </a>
              </div>
            )}

            {data.resourceType === "directory" && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="px-6 pt-6 pb-4">
                  <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    {data.name}
                  </h1>
                  <div className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    <button
                      type="button"
                      onClick={() => setDirId(null)}
                      className="bg-transparent border-none p-0 cursor-pointer font-semibold"
                      style={{ color: dirId ? "var(--accent-green, #2e7d32)" : "inherit" }}
                    >
                      {data.breadcrumbTrail?.[0]?.name}
                    </button>
                    {(data.breadcrumbTrail || []).slice(1).map((crumb) => (
                      <span key={crumb.id}>
                        {" / "}
                        <button
                          type="button"
                          onClick={() => setDirId(crumb.id)}
                          className="bg-transparent border-none p-0 cursor-pointer"
                          style={{
                            color: crumb.id === dirId ? "var(--text-primary)" : "inherit",
                            fontWeight: crumb.id === dirId ? 600 : 400,
                          }}
                        >
                          {crumb.name}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <ul className="list-none m-0 p-0">
                  {items.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 px-6 py-3.5"
                      style={{ borderTop: "1px solid var(--border-subtle)" }}
                      onClick={() => entry.isDirectory && setDirId(entry.id)}
                    >
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {entry.isDirectory ? <FolderIcon /> : <FileIcon />}
                      </span>
                      <span
                        className="flex-1 truncate text-sm cursor-pointer"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {entry.name}
                      </span>
                      {!entry.isDirectory && (
                        <>
                          <span className="text-xs shrink-0" style={{ color: "var(--text-tertiary)" }}>
                            {formatSize(entry.size)}
                          </span>
                          <a
                            href={downloadUrl(token, entry.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 no-underline text-sm px-4 py-1.5 rounded-full"
                            style={{
                              color: "var(--text-primary)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            Download
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {items.length === 0 && (
                  <p className="text-center py-10 italic text-sm" style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--border-subtle)" }}>
                    This folder is empty.
                  </p>
                )}

                {nextCursor && (
                  <div className="flex justify-center py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-5 py-2 rounded-full cursor-pointer text-sm"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ShareView;
