import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

const SITE = "https://www.convertek.tech";
const CONTACT = "support@convertek.tech";
const UPDATED = "October 28, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Convertek handles uploads, temporary processing, local browser history, accounts, and aggregate usage data. Privacy-first file conversion.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Convertek",
    description:
      "How Convertek handles uploads, temporary processing, local history, and accounts.",
    url: `${SITE}/privacy`,
    type: "website",
  },
  robots: { index: true, follow: true },
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

      <h2>5. Cookies, ads and consent</h2>
      <p>
        A small amount of storage keeps the site running, and we ask before
        anything optional is used. Visitors in the EEA, the UK and Switzerland
        see a cookie notice on their first visit with “Accept all”, “Reject
        optional” and per-category preferences.
      </p>
      <ul>
        <li>
          <strong className="text-foreground">Essential (always on):</strong>{" "}
          a session cookie for sign-in, plus local storage for your theme and for
          remembering this cookie choice. The service cannot work without these.
        </li>
        <li>
          <strong className="text-foreground">Analytics (optional):</strong>{" "}
          first-party page-view counts that show which pages and formats are
          used. They are recorded by our own server — no third-party analytics
          script and no cross-site profile.
        </li>
        <li>
          <strong className="text-foreground">Advertising (optional):</strong>{" "}
          cookies set by Google AdSense and its partners, described in section 6.
        </li>
      </ul>
      <p>
        You can change or withdraw your choice at any time with the “Cookie
        settings” link in the footer of every page. Rejecting optional cookies
        does not limit any conversion feature.
      </p>

      <h2>6. Third-party advertising (Google AdSense)</h2>
      <p>
        Convertek is free and supported by advertising. We use Google AdSense
        (publisher ID <code>pub-1501827698606542</code>) to display ads. Google
        and its partners may use cookies, device identifiers and your IP address
        to select and measure those ads.
      </p>
      <p>
        The AdSense loader runs on every page so ads can be placed
        automatically. Your choice in the cookie notice decides whether those
        ads are personalised: until you allow advertising — and again if you
        reject it — the site requests non-personalised ads only, which are
        chosen from the page content rather than from your browsing history.
      </p>
      <ul>
        <li>
          Third-party vendors, including Google, use cookies to serve ads based
          on your prior visits to this website or other websites.
        </li>
        <li>
          Google’s use of advertising cookies enables it and its partners to
          serve ads to you based on your visit to this site and/or other sites
          on the internet.
        </li>
        <li>
          You can opt out of personalised advertising by visiting{" "}
          <a href="https://www.google.com/settings/ads">Google Ads Settings</a>.
          You can also opt out of third-party vendors’ use of cookies for
          personalised advertising at{" "}
          <a href="https://www.aboutads.info/choices/">
            aboutads.info/choices
          </a>{" "}
          or, in the EU and UK,{" "}
          <a href="https://www.youronlinechoices.eu/">youronlinechoices.eu</a>.
        </li>
        <li>
          If you decline advertising cookies, ads may still appear, but they are
          served without personalised targeting — or not shown at all.
        </li>
        <li>
          We never pass the contents of your uploaded files, your account email
          or your conversion history to advertising partners. Ad requests are
          made by ad code in your browser, not by our conversion servers.
        </li>
      </ul>
      <p>
        Ad vendors handle that data under their own privacy policies; Google’s
        is at{" "}
        <a href="https://policies.google.com/technologies/partner-sites">
          policies.google.com/technologies/partner-sites
        </a>
        .
      </p>

      <h2>7. Sharing</h2>
      <p>
        We do not sell your files or personal contact data. Hosting providers
        (for example application host and managed database/email) process data
        only to run the service under our configuration. We may disclose
        information if required by law or to protect the service and users.
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard practices suitable for a hosted web app
        (HTTPS, hashed passwords, access controls for admin tools). No online
        service is perfectly secure; avoid uploading highly sensitive secrets
        when possible.
      </p>

      <h2>9. Children</h2>
      <p>
        The service is not directed at children under 13 (or the age required
        in your region). Do not use the service if you are under that age.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy. The “Last updated” date above will change
        when we do. Continued use after updates means you accept the revised
        policy.
      </p>

      <h2>11. Contact</h2>
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
