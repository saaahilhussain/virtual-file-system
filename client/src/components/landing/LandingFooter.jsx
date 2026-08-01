import { Link } from "react-router-dom";
import BrandMark from "../BrandMark";

const LandingFooter = () => {
  return (
    <footer
      className="w-full border-t pt-12 pb-8 px-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BrandMark text="File Shelter" size={30} />
          </div>
          <p
            className="text-base max-w-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Secure file storage and clean collaboration for teams and
            individuals who want a calm, focused workspace.
          </p>
        </div>

        <div>
          <h4
            className="text-base font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Product
          </h4>
          <div
            className="space-y-2 text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            <p>Features</p>
            <p>Pricing</p>
            <p>How to use</p>
          </div>
        </div>

        <div>
          <h4
            className="text-base font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Support
          </h4>
          <div
            className="space-y-2 text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            <p>help@fileshelter.app</p>
            <p>Mon - Fri, 9:00 AM to 6:00 PM</p>
            <p>Response within 24 hours</p>
          </div>
        </div>
      </div>

      <div
        className="max-w-6xl mx-auto mt-10 pt-6 border-t flex flex-col sm:flex-row justify-between gap-3 text-sm"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        <p>© {new Date().getFullYear()} File Shelter. All rights reserved.</p>
        <p className="landing-footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <span>·</span>
          <span>Terms</span>
          <span>·</span>
          <span>Security</span>
        </p>
      </div>
    </footer>
  );
};

export default LandingFooter;
