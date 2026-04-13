import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PreAuthHeader from "../components/PreAuthHeader";

const LandingPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      style={{
        backgroundColor: "var(--bg-canvas)",
        color: "var(--text-primary)",
      }}
    >
      <PreAuthHeader />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        {/* Glow effect */}
        <div
          className="absolute rounded-full w-[600px] h-[600px] blur-3xl opacity-30 -top-40 -left-40 pointer-events-none"
          style={{ backgroundColor: "var(--accent-green-soft)" }}
        ></div>
        <div
          className="absolute rounded-full w-[800px] h-[800px] blur-3xl opacity-10 -bottom-80 -right-40 pointer-events-none"
          style={{ backgroundColor: "var(--accent-black)" }}
        ></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center pt-32">
          <h1
            className="text-6xl md:text-8xl font-bold font-['Outfit'] mb-8 tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Your Digital Space
          </h1>
          <p
            className="text-xl md:text-2xl mb-12 max-w-2xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Store, organize, and share your files with an elegant and secure
            platform designed for modern workflows.
          </p>
          <div className="flex gap-6 mb-16">
            <button
              onClick={() => navigate("/login")}
              className="px-10 py-4 rounded-full text-lg font-semibold transition-all hover:-translate-y-1 hover:shadow-2xl"
              style={{
                backgroundColor: "var(--accent-black)",
                color: "var(--bg-canvas)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              }}
            >
              Continue to App →
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("preview")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-10 py-4 rounded-full text-lg font-semibold transition-all hover:-translate-y-1 hover:bg-black/5"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Feature Highlights or Preview */}
        <div
          id="preview"
          className="mt-8 mb-24 relative w-full max-w-5xl rounded-2xl overflow-hidden border transition-all duration-1000 transform hover:scale-[1.01]"
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
            className="p-8 h-80 flex items-center justify-center bg-opacity-50"
            style={{ backgroundColor: "var(--bg-canvas)" }}
          >
            {/* Dashboard mock */}
            <div className="grid grid-cols-3 gap-6 w-full h-full">
              <div
                className="col-span-1 rounded-xl animate-pulse"
                style={{ backgroundColor: "var(--accent-green-soft)" }}
              ></div>
              <div className="col-span-2 flex flex-col gap-4">
                <div
                  className="h-16 rounded-xl animate-pulse w-full"
                  style={{ backgroundColor: "var(--bg-surface)" }}
                ></div>
                <div
                  className="h-full rounded-xl animate-pulse w-full"
                  style={{ backgroundColor: "var(--bg-surface)" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
