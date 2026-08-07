import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

const SITE = "https://www.convertek.tech";
const CONTACT = "support@convertek.tech";
const UPDATED = "August 2, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Convertek handles uploads, local history, accounts, and aggregate usage data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Convertek",
    url: `${SITE}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated={UPDATED}>
      <p>
        This policy describes how Convertek (
        <a href={SITE}>{SITE.replace("https://", "")}</a>) handles information
        when you use our file conversion service. We aim to be transparent and
        accurate about what happens during conversion.
      </p>

      <h2>1. Summary</h2>
      <ul>
        <li>
          Converted files and user history are stored in{" "}
          <strong className="text-foreground">your browser</strong> (IndexedDB),
          not as a permanent personal cloud library on our servers.
        </li>
        <li>
          Uploads are processed temporarily on our servers (or dynos) to produce
          the converted output, then discarded from working storage after the
          job finishes or expires.
        </li>
        <li>
          We may keep <strong className="text-foreground">anonymous or
          hashed operational stats</strong> (for example format pairs, sizes,
          success/error status) for reliability and admin analytics. Guest
          uploads use anonymized file names and hashed IP-style identifiers
          where logging is enabled.
        </li>
        <li>
          If you create an account, we store account credentials and profile
          fields you provide (such as email and display name).
        </li>
      </ul>

      <h2>2. Information we process</h2>
      <ul>
        <li>
          <strong className="text-foreground">Files you submit:</strong>{" "}
          content is used only to perform the requested conversion or related
          tools (for example merge/split). Do not upload unlawful content.
        </li>
        <li>
          <strong className="text-foreground">Technical data:</strong> request
          metadata needed to run the service (IP for rate limits and abuse
          prevention, user agent, timestamps).
        </li>
        <li>
          <strong className="text-foreground">Account data:</strong> email,
          password hash (if you register), optional name, and session tokens.
        </li>
        <li>
          <strong className="text-foreground">Local history:</strong>{" "}
          conversion history and downloadable result blobs you keep are stored
          in this browser&apos;s IndexedDB. Clearing site data or using another
          device removes or hides that history for you.
        </li>
        <li>
          <strong className="text-foreground">Contact / reports:</strong> if
          you email us or send a report form, we use that message to respond
          and improve the service.
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <ul>
        <li>Provide, secure, and improve conversion and related features</li>
        <li>Enforce limits, prevent abuse, and debug failures</li>
        <li>Operate accounts, login sessions, and optional password recovery</li>
        <li>Respond to support and broken-convert reports</li>
      </ul>

      <h2>4. Retention</h2>
      <ul>
        <li>
          Working uploads and intermediate files are temporary and are not kept
          as a long-term file host.
        </li>
        <li>
          Operational conversion logs (anonymized or aggregate where applicable)
          may be retained for analytics and abuse prevention for a limited
          operational period.
        </li>
        <li>
          Account data remains until you delete your account or request
          deletion (subject to legal holds if required).
        </li>
        <li>
          Browser history remains until you delete it or clear browser storage.
        </li>
      </ul>

      <h2>5. Cookies and similar tech</h2>
      <p>
        We use essential cookies/session storage for sign-in and preferences
        (for example theme). We do not sell personal data. Third-party ads or
        analytics may apply only if enabled by the site operator via CMS.
      </p>

      <h2>6. Sharing</h2>
      <p>
        We do not sell your files or personal contact data. Hosting providers
        (for example application host and managed database/email) process data
        only to run the service under our configuration. We may disclose
        information if required by law or to protect the service and users.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard practices suitable for a hosted web app
        (HTTPS, hashed passwords, access controls for admin tools). No online
        service is perfectly secure; avoid uploading highly sensitive secrets
        when possible.
      </p>

      <h2>8. Children</h2>
      <p>
        The service is not directed at children under 13 (or the age required
        in your region). Do not use the service if you are under that age.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy. The “Last updated” date above will change
        when we do. Continued use after updates means you accept the revised
        policy.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        <br />
        Also see our{" "}
        <Link href="/terms" className="text-emerald-600">
          Terms of Service
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
