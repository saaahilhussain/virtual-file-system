const FEATURES = [
  {
    title: "Smart Organization",
    description:
      "Create nested folders, rename instantly, and keep every document exactly where it belongs.",
  },
  {
    title: "Secure Sharing",
    description:
      "Share file access safely with session-based protection and role-based controls for teams.",
  },
  {
    title: "Always in Sync",
    description:
      "Uploads, trash, restore, and storage stats update in real time so your workspace stays accurate.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="w-full max-w-6xl px-2 sm:px-4">
      <div className="text-center mb-10">
        <h2
          className="text-4xl md:text-5xl font-bold font-['Outfit'] mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Features
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Everything you need to keep files organized, searchable, and
          accessible.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl p-6 text-left border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-float)",
            }}
          >
            <h3
              className="text-xl font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              {feature.title}
            </h3>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
