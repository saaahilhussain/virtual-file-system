import PreviewSection from "./PreviewSection";

const HeroSection = ({ onPrimaryClick }) => {
  return (
    <section
      id="landing-hero"
      className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center pt-28 md:pt-32 pb-12 md:pb-16 scroll-mt-28"
    >
      <h1
        className="text-6xl md:text-8xl font-bold font-['Outfit'] mb-6 tracking-tight leading-none"
        style={{ color: "var(--text-primary)" }}
      >
        Your Digital Space
      </h1>
      <p
        className="text-xl md:text-2xl mb-10 max-w-2xl"
        style={{ color: "var(--text-secondary)" }}
      >
        Store, organize, and share your files with an elegant and secure
        platform designed for modern workflows.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-8 md:mb-10 w-full sm:w-auto px-4 sm:px-0">
        <button
          onClick={onPrimaryClick}
          className="w-full sm:w-auto px-8 py-3 rounded-full text-base sm:text-lg sm:px-10 sm:py-4 font-semibold transition-all hover:-translate-y-1 hover:shadow-2xl whitespace-nowrap"
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
          className="w-full sm:w-auto px-8 py-3 rounded-full text-base sm:text-lg sm:px-10 sm:py-4 font-semibold transition-all hover:-translate-y-1 hover:bg-black/5 whitespace-nowrap"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        >
          Learn More
        </button>
      </div>

      <div className="w-full mt-0 md:mt-2">
        <PreviewSection />
      </div>
    </section>
  );
};

export default HeroSection;
