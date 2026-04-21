import React from "react";

const PreviewSection = () => {
  return (
    <section
      id="preview"
      className="relative w-full max-w-5xl rounded-2xl overflow-hidden border transition-all duration-1000 transform hover:scale-[1.01]"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-float)",
      }}
    >
      <div
        className="h-10 border-b flex items-center px-4 gap-2"
        style={{
          backgroundColor: "var(--bg-canvas)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="w-3 h-3 rounded-full bg-red-400"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div className="w-3 h-3 rounded-full bg-green-400"></div>
      </div>
      <div
        className="p-4 sm:p-8 flex items-center justify-center bg-opacity-50"
        style={{ backgroundColor: "var(--bg-canvas)" }}
      >
        <div
          className="flex w-full max-w-4xl h-96 rounded-xl overflow-hidden shadow-sm"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <div
            className="hidden sm:flex w-1/4 flex-col p-4 border-r"
            style={{
              backgroundColor: "var(--bg-canvas)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex items-center gap-2 mb-8">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "var(--accent-black)" }}
              ></div>
              <div
                className="font-semibold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                FileShelter
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  className="w-4 h-4 rounded opacity-70"
                  style={{ backgroundColor: "var(--accent-black)" }}
                ></div>
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  My Files
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-60">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: "var(--text-tertiary)" }}
                ></div>
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Recent
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-60">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: "var(--text-tertiary)" }}
                ></div>
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Trash
                </div>
              </div>
            </div>
            <div
              className="mt-auto p-3 rounded-lg flex flex-col gap-2"
              style={{
                background:
                  "linear-gradient(135deg, rgba(74, 99, 72, 0.1), transparent)",
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Storage
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="w-2/3 h-full rounded-full"
                  style={{ backgroundColor: "var(--accent-black)" }}
                ></div>
              </div>
            </div>
          </div>

          <div
            className="flex-1 flex flex-col"
            style={{ backgroundColor: "var(--bg-surface)" }}
          >
            <div
              className="h-14 border-b flex items-center justify-between px-6"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div
                className="w-32 sm:w-48 h-7 rounded-full flex items-center px-3"
                style={{ backgroundColor: "var(--bg-canvas)" }}
              >
                <div
                  className="w-3 h-3 rounded-full opacity-40 mr-2"
                  style={{ backgroundColor: "var(--text-tertiary)" }}
                ></div>
                <div
                  className="w-16 sm:w-20 h-2 rounded-full opacity-30"
                  style={{ backgroundColor: "var(--text-tertiary)" }}
                ></div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: "var(--accent-black)" }}
                >
                  +
                </div>
                <div
                  className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: "var(--accent-green-soft)" }}
                ></div>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 flex flex-col gap-4">
              <div
                className="flex items-center gap-2 mb-2 text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                All Files <span className="text-[10px] opacity-50">/</span>
                Projects <span className="text-[10px] opacity-50">/</span>
                <span style={{ color: "var(--text-primary)" }}>
                  Design Assets
                </span>
              </div>

              <div
                className="grid grid-cols-12 gap-2 sm:gap-4 text-[10px] font-semibold tracking-wider uppercase pb-2 border-b"
                style={{
                  color: "var(--text-tertiary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="col-span-8 sm:col-span-6">Name</div>
                <div className="hidden sm:block sm:col-span-3">Size</div>
                <div className="col-span-4 sm:col-span-3 text-right sm:text-left">
                  Modified
                </div>
              </div>

              {[
                {
                  name: "document.pdf",
                  icon: "bg-blue-400",
                  size: "2.4 MB",
                  date: "Just now",
                },
                {
                  name: "presentation.mp4",
                  icon: "bg-purple-400",
                  size: "45 MB",
                  date: "2 hrs ago",
                },
                {
                  name: "photo.jpeg",
                  icon: "bg-green-400",
                  size: "4.1 MB",
                  date: "Yesterday",
                },
              ].map((file) => (
                <div
                  key={file.name}
                  className="grid grid-cols-12 gap-2 sm:gap-4 items-center py-3 border-b hover:bg-black/5 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div className="col-span-8 sm:col-span-6 flex items-center gap-3">
                    <div
                      className={`w-8 h-8 sm:w-6 sm:h-6 rounded shrink-0 ${file.icon} opacity-80 flex items-center justify-center text-[8px] font-bold text-white uppercase`}
                    >
                      {file.name.split(".").pop().substring(0, 3)}
                    </div>
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {file.name}
                    </div>
                  </div>
                  <div
                    className="hidden sm:block sm:col-span-3 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {file.size}
                  </div>
                  <div
                    className="col-span-4 sm:col-span-3 text-xs text-right sm:text-left"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {file.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreviewSection;
