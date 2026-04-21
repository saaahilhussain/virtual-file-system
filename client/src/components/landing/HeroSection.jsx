import React from "react";

const HeroSection = ({ onPrimaryClick }) => {
  return (
    <section
      id="landing-hero"
      className="relative z-10 max-w-4xl mx-auto flex flex-col items-center pt-24 md:pt-32"
    >
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
      <div className="flex gap-6 mb-8">
        <button
          onClick={onPrimaryClick}
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
    </section>
  );
};

export default HeroSection;
