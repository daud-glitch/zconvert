import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

const SITE = "https://www.convertek.tech";
const CONTACT = "support@convertek.tech";
const UPDATED = "August 2, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Rules for using Convertek file conversion at www.convertek.tech.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Convertek",
    url: `${SITE}/terms`,
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms govern use of Convertek at{" "}
        <a href={SITE}>{SITE.replace("https://", "")}</a> (the “Service”). By
        using the Service you agree to these Terms and our{" "}
        <Link href="/privacy" className="text-emerald-600">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>1. The Service</h2>
      <p>
        Convertek provides browser-based file conversion and related
        utilities. Features, formats, and capacity depend on the server
        configuration and may change. Limits may include maximum upload size,
        request rate limits, and formats that require system tools (for
        example ffmpeg-backed audio/video).
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>
          Accounts are optional for many conversions. If you register, you must
          provide accurate information and keep credentials secure.
        </li>
        <li>
          You are responsible for activity under your account. Notify us at{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a> if you suspect
          unauthorized access.
        </li>
        <li>
          We may suspend accounts that abuse the Service or violate these
          Terms.
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload illegal, harmful, or infringing content</li>
        <li>
          Attempt to disrupt, overload, reverse engineer, or probe the Service
          beyond normal use
        </li>
        <li>
          Bypass rate limits, security controls, or access admin areas without
          authorization
        </li>
        <li>
          Use the Service to distribute malware or to process content you do
          not have rights to process
        </li>
        <li>
          Resell or automate bulk conversion in a way that harms other users
          or our infrastructure without written permission
        </li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        You retain rights to files you upload. You grant us a limited license
        to process those files solely to provide the conversion result. You
        confirm you have the rights needed to upload and convert the content.
        Results saved in browser storage remain under your control on that
        device.
      </p>

      <h2>5. Availability and changes</h2>
      <p>
        We provide the Service “as is.” Features may be modified, limited, or
        discontinued. We do not guarantee uninterrupted uptime or that every
        conversion will succeed for every file.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The Convertek name, site design, and software (except your files)
        are owned by the operator or its licensors. You may not copy or
        rebrand the Service without permission.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        To the fullest extent permitted by law, we disclaim warranties of
        merchantability, fitness for a particular purpose, and non-infringement.
        Conversion quality depends on input files and available converters.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect,
        incidental, special, consequential, or lost-profit damages, or for lost
        data arising from use of the Service. Our total liability for any claim
        relating to the Service is limited to the greater of (a) amounts you
        paid us for the Service in the 12 months before the claim, or (b) USD
        $50 if you used a free tier only.
      </p>

      <h2>9. Indemnity</h2>
      <p>
        You will defend and hold us harmless from claims arising from your
        content or your misuse of the Service.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws applicable in the operator’s
        place of establishment, without regard to conflict-of-law rules, unless
        mandatory consumer protections in your jurisdiction apply.
      </p>

      <h2>11. Changes to Terms</h2>
      <p>
        We may update these Terms. The “Last updated” date will change when we
        do. Continued use constitutes acceptance of updated Terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </LegalPageShell>
  );
}
