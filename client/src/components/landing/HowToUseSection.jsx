import React from "react";

const STEPS = [
  {
    step: "01",
    title: "Create your account",
    text: "Sign up, verify your email, and access your personal root workspace.",
  },
  {
    step: "02",
    title: "Upload and organize",
    text: "Drag in files, create folders, and keep everything grouped by projects.",
  },
  {
    step: "03",
    title: "Manage and collaborate",
    text: "Rename, delete, restore, and manage users based on your role permissions.",
  },
];

const HowToUseSection = () => {
  return (
    <section id="how-to-use" className="w-full max-w-6xl px-2 sm:px-4">
      <div className="text-center mb-10">
        <h2
          className="text-4xl md:text-5xl font-bold font-['Outfit'] mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          How to use
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Get started in minutes with a simple three-step flow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STEPS.map((item) => (
          <div
            key={item.step}
            className="rounded-2xl p-6 text-left border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <p
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              STEP {item.step}
            </p>
            <h3
              className="text-xl font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              {item.title}
            </h3>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowToUseSection;
