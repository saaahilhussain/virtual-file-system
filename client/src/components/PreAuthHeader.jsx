import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PreAuthHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBrandClick = () => {
    if (location.pathname === "/") {
      document.getElementById("landing-top")?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
      return;
    }

    navigate("/");
  };

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <nav
      className="flex justify-between items-center px-10 py-6 box-border fixed top-0 left-0 right-0 z-50"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        onClick={handleBrandClick}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: "var(--accent-black)" }}
        ></div>
        <span
          className="text-xl font-bold font-['Outfit']"
          style={{ color: "var(--text-primary)" }}
        >
          File Shelter
        </span>
      </div>

      {location.pathname === "/" && (
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          <button
            type="button"
            onClick={() => scrollToSection("features")}
            className="text-base font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("pricing")}
            className="text-base font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("how-to-use")}
            className="text-base font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            How to use
          </button>
        </div>
      )}

      <div className="flex gap-4 items-center">
        <button
          className="theme-toggle"
          onClick={toggleDarkMode}
          title="Toggle dark mode"
          type="button"
          style={{
            position: "relative",
            top: "auto",
            right: "auto",
            margin: 0,
          }}
        >
          <svg
            className="icon-sun"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg
            className="icon-moon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>

        {location.pathname === "/" && (
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 rounded-full text-base font-normal transition-all hover:scale-105"
            style={{
              backgroundColor: "var(--bg-canvas)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            Log In
          </button>
        )}
        <button
          onClick={() => {
            if (location.pathname === "/" || location.pathname === "/login")
              navigate("/register");
            else navigate("/login");
          }}
          className="px-6 py-2 rounded-full text-base font-semibold transition-all hover:scale-105"
          style={{
            backgroundColor: "var(--accent-black)",
            color: "var(--bg-canvas)",
          }}
        >
          {location.pathname === "/" || location.pathname === "/login"
            ? "Create an account"
            : "I have an account"}
        </button>
      </div>
    </nav>
  );
};

export default PreAuthHeader;
