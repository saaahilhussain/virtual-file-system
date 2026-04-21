import React from "react";

const PRICING_PLANS = [
  {
    name: "Free",
    price: "Rs. 0",
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
    price: "Rs. 199/-",
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
    price: "Rs. 499/-",
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan) => (
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
              {plan.price}
            </p>
            <ul
              className="space-y-2 text-base"
              style={{ color: "var(--text-secondary)" }}
            >
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
