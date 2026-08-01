import { Link } from "react-router-dom";
import PreAuthHeader from "../components/PreAuthHeader";

function Section({ title, children }) {
  return (
    <section className="privacy-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <PreAuthHeader />

      <main className="privacy-main">
        <div className="privacy-hero">
          <p className="privacy-eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="privacy-intro">
            This Privacy Policy explains how File Shelter collects, uses,
            stores, and shares information when you use our website and
            services.
          </p>
          <p className="privacy-effective">
            Effective date: July 28, 2026
          </p>
        </div>

        <div className="privacy-card">
          <p className="privacy-note">
            File Shelter is a cloud file storage service. This policy is written
            to reflect the current product architecture and should be reviewed
            by counsel before final publication if you need formal legal advice.
          </p>

          <Section title="1. Information We Collect">
            <p>
              We collect information you provide directly, information generated
              by your use of the service, and information received from sign-in
              providers.
            </p>
            <ul>
              <li>
                Account information such as your name, email address, profile
                picture, and password if you create one.
              </li>
              <li>
                Authentication data from Google or GitHub when you use social
                sign-in, including profile details returned by those providers.
              </li>
              <li>
                Files, folders, file names, sizes, folder structure, trash
                activity, and other content you store or upload.
              </li>
              <li>
                Usage and device data such as session identifiers, IP address,
                browser type, timestamps, and access logs.
              </li>
              <li>
                Billing and subscription details if you purchase a plan through
                our payment provider.
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Information">
            <ul>
              <li>Provide, maintain, and secure your account and files.</li>
              <li>Authenticate users and keep sessions active.</li>
              <li>Store, retrieve, organize, and deliver your uploads.</li>
              <li>Process payments, subscriptions, and plan upgrades.</li>
              <li>Monitor abuse, troubleshoot issues, and improve the service.</li>
              <li>Comply with legal obligations and enforce our terms.</li>
            </ul>
          </Section>

          <Section title="3. How We Share Information">
            <p>We do not sell personal information.</p>
            <p>
              We may share information with service providers that help us run
              the platform, including:
            </p>
            <ul>
              <li>Google for OAuth authentication.</li>
              <li>GitHub for OAuth authentication.</li>
              <li>AWS for file storage and content delivery.</li>
              <li>MongoDB for application data storage.</li>
              <li>Redis for session and operational data.</li>
              <li>Razorpay for payment processing, if applicable.</li>
            </ul>
            <p>
              We may also disclose information if required by law, to protect
              our rights, or to investigate fraud or misuse.
            </p>
          </Section>

          <Section title="4. Cookies And Sessions">
            <p>
              We use cookies and similar technologies to keep you signed in,
              remember preferences, and protect the service. The session cookie
              stored in your browser is used to maintain your login state.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We keep account information and stored files for as long as your
              account remains active or as needed to provide the service. If you
              delete content or close your account, we may retain limited
              records for legal, operational, or security reasons.
            </p>
          </Section>

          <Section title="6. How We Protect Your Files">
            <p>
              Your files are stored for your account and are not visible to
              other users. Access to files and folders is tied to authenticated
              sessions, so only you can view, manage, or delete the content in
              your account unless you choose to share it in a future feature.
            </p>
            <p>
              We use technical and organizational safeguards designed to keep
              your data protected while it is stored and delivered through the
              service. No system is perfectly secure, but File Shelter is built
              to treat your files as private by default.
            </p>
          </Section>

          <Section title="7. Can We See Your Files?">
            <p>
              In normal operation, we do not access your files. We store and
              deliver them on your behalf, and access is limited to the systems
              needed to run the product.
            </p>
            <p>
              We may review file-related data only when needed for support,
              troubleshooting, abuse prevention, security, or legal compliance.
              We do not inspect user files for advertising or unrelated
              purposes.
            </p>
          </Section>

          <Section title="8. Your Choices">
            <ul>
              <li>You can update your account details and password.</li>
              <li>You can remove files and folders from your account.</li>
              <li>You can disconnect access by logging out or clearing cookies.</li>
            </ul>
          </Section>

          <Section title="9. Children">
            <p>
              File Shelter is not intended for children under 13, and we do not
              knowingly collect personal information from children under 13.
            </p>
          </Section>

          <Section title="10. Changes To This Policy">
            <p>
              We may update this policy from time to time. We will post the
              revised version on this page and update the effective date.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              If you have questions about this policy, contact us at{" "}
              <a href="mailto:help@fileshelter.app">help@fileshelter.app</a>.
            </p>
          </Section>

          <div className="privacy-footer-links">
            <Link to="/">Back to home</Link>
            <Link to="/plans">View plans</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PrivacyPolicy;
