import React from "react";
import { useNavigate } from "react-router-dom";

const PreAuthHeader = () => {
  const navigate = useNavigate();

  return (
    <nav
      className="flex justify-between items-center px-10 py-6 w-full fixed top-0 left-0 z-50"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div 
        className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        onClick={() => navigate("/")}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: "var(--accent-black)" }}
        ></div>
        <span className="text-xl font-bold font-['Outfit']" style={{ color: "var(--text-primary)" }}>
          File Shelter
        </span>
      </div>
      <div className="flex gap-4">
        {window.location.pathname !== "/login" && (
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 rounded-full font-medium transition-all hover:scale-105"
            style={{ backgroundColor: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Log In
          </button>
        )}
        {window.location.pathname !== "/register" && (
          <button
            onClick={() => navigate("/register")}
            className="px-6 py-2 rounded-full font-medium transition-all hover:scale-105"
            style={{ backgroundColor: "var(--accent-black)", color: "white" }}
          >
            Sign Up
          </button>
        )}
      </div>
    </nav>
  );
};

export default PreAuthHeader;
