import React, { useMemo, useState } from "react";

const PRICING_PLANS = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyDiscount: 0,
    highlighted: false,
    features: [
      "50 GB secure storage",
      "File upload limit: 100 MB per file",
      "Access from 1 device",
      "Standard download speed",
      "Basic email support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 199,
    yearlyPrice: 149,
    yearlyDiscount: 50,
    highlighted: true,
    features: [
      "200 GB secure storage",
      "File upload limit: 2 GB per file",
      "Access from up to 3 devices",
      "Priority upload/download speed",
      "Email & chat support",
    ],
  },
  {
    name: "Business",
    monthlyPrice: 649,
    yearlyPrice: 499,
    yearlyDiscount: 100,
    highlighted: false,
    features: [
      "2 TB secure storage",
      "File upload limit: 10 GB per file",
      "Access from up to 3 devices",
      "Priority upload/download speed",
      "Priority customer support",
    ],
  },
];

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const planCards = useMemo(
    () =>
      PRICING_PLANS.map((plan) => {
        const monthlyPrice = plan.monthlyPrice;
        const yearlyMonthlyPrice = plan.yearlyPrice ?? monthlyPrice;
        const yearlyTotal = yearlyMonthlyPrice * 12;
        const monthlyEquivalent = yearlyTotal / 12;
        const yearlySavings = (monthlyPrice - yearlyMonthlyPrice) * 12;

        return {
          ...plan,
          priceLabel:
            billingCycle === "monthly"
              ? monthlyPrice === 0
                ? "₹0"
                : `₹${monthlyPrice}/mo`
              : monthlyEquivalent === 0
                ? "₹0"
                : `₹${monthlyEquivalent.toFixed(0)}/mo`,
          billingNote:
            billingCycle === "monthly"
              ? monthlyPrice === 0
                ? "Billed monthly"
                : "Billed every month"
              : `Billed annually at ₹${yearlyTotal.toLocaleString()}`,
          savingsNote:
            billingCycle === "yearly" && plan.yearlyDiscount > 0
              ? `Saves you ₹${yearlySavings.toLocaleString()} per year`
              : "",
        };
      }),
    [billingCycle],
  );

  return (
    <section id="pricing" className="w-full max-w-6xl px-2 sm:px-4">
      <div className="text-center mb-10">
        <h2
          className="text-4xl md:text-5xl font-bold font-['Outfit'] mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Pricing
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Start free and upgrade when your storage and collaboration needs grow.
        </p>
      </div>

      <div className="flex justify-center mb-10">
        <div
          className="inline-flex rounded-full p-1 border"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-float)",
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              backgroundColor:
                billingCycle === "monthly"
                  ? "var(--accent-black)"
                  : "transparent",
              color:
                billingCycle === "monthly"
                  ? "var(--bg-canvas)"
                  : "var(--text-secondary)",
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              backgroundColor:
                billingCycle === "yearly"
                  ? "var(--accent-black)"
                  : "transparent",
              color:
                billingCycle === "yearly"
                  ? "var(--bg-canvas)"
                  : "var(--text-secondary)",
            }}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planCards.map((plan) => (
          <div
            key={plan.name}
            className="rounded-2xl p-8 border text-center"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: plan.highlighted
                ? "var(--accent-black)"
                : "var(--border-subtle)",
              boxShadow: plan.highlighted ? "var(--shadow-float)" : "none",
            }}
          >
            <p
              className="text-base mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {plan.name}
            </p>
            <p
              className="text-4xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {plan.priceLabel}
            </p>
            <p
              className="text-base md:text-lg font-medium mb-4"
              style={{
                color: "var(--text-primary)",
              }}
            >
              <span>{plan.billingNote}</span>
              {plan.savingsNote ? (
                <span className="block mt-1" style={{ color: "#2e8b57" }}>
                  {plan.savingsNote}
                </span>
              ) : null}
            </p>
            <ul
              className="mt-4 pt-3 border-t space-y-2 text-base md:text-[16px] leading-6 font-semibold"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#2e8b57]" aria-hidden="true">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
