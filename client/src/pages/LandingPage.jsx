import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PreAuthHeader from "../components/PreAuthHeader";
import HeroSection from "../components/landing/HeroSection";
import PreviewSection from "../components/landing/PreviewSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import PricingSection from "../components/landing/PricingSection";
import HowToUseSection from "../components/landing/HowToUseSection";
import LandingFooter from "../components/landing/LandingFooter";

const LandingPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    window.scrollTo({ top: 0, behavior: "auto" });
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

      <main className="flex-1 flex flex-col items-center text-center px-4 pt-20 relative overflow-hidden">
        {/* Glow effect */}
        <div
          className="absolute rounded-full w-[600px] h-[600px] blur-3xl opacity-30 -top-40 -left-40 pointer-events-none"
          style={{ backgroundColor: "var(--accent-green-soft)" }}
        ></div>
        <div
          className="absolute rounded-full w-[800px] h-[800px] blur-3xl opacity-10 -bottom-80 -right-40 pointer-events-none"
          style={{ backgroundColor: "var(--accent-black)" }}
        ></div>

        <HeroSection onPrimaryClick={() => navigate("/login")} />

        <div className="relative z-10 w-full flex flex-col items-center gap-40 md:gap-48 pt-20 pb-24">
          <PreviewSection />
          <FeaturesSection />
          <PricingSection />
          <HowToUseSection />
          <LandingFooter />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
