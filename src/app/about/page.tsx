import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

const SITE = "https://www.convertek.tech";
const CONTACT = "support@convertek.tech";
const UPDATED = "August 4, 2026";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Convertek — free online file conversion with mixed-type batch, per-file formats, and privacy-first processing.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About | Convertek",
    url: `${SITE}/about`,
  },
};

export default function AboutPage() {
  return (
    <LegalPageShell title="About Convertek" updated={UPDATED}>
      <p>
        Convertek (
        <a href={SITE}>{SITE.replace("https://", "")}</a>) is a free online file
        converter for images, documents, data, audio, video, archives, fonts,
        subtitles, presentations, and ebooks. Convert without watermarks, with
        fair upload limits, and keep results in your own browser when signed in
        or as a guest download.
      </p>

      <h2>What makes us different</h2>
      <ul>
        <li>
          <strong className="text-foreground">Mixed-type batch:</strong> drop
          different file types in one queue — PNG, PDF, MP3, and more together.
        </li>
        <li>
          <strong className="text-foreground">Per-file formats:</strong> choose
          a separate output format for every file; you are not forced into a
          single target for the whole batch.
        </li>
        <li>
          <strong className="text-foreground">Privacy-first:</strong> files are
          processed temporarily on the server; converted results stay in your
          browser storage for download.
        </li>
        <li>
          <strong className="text-foreground">No watermarks:</strong> free
          conversions without branding your files.
        </li>
      </ul>

      <h2>How conversion works</h2>
      <p>
        You upload a file (or a batch), pick target format(s), and we convert on
        the server using format engines suited to each type. When conversion
        finishes, you download the result. We do not keep a permanent personal
        cloud library of your files on the server after processing.
      </p>

      <h2>Accounts &amp; history</h2>
      <p>
        Guests can convert freely within fair limits. Creating an account unlocks
        synced bookmarks and durable conversion history in this browser for your
        sign-in. Bookmarks are stored with your account so you can reuse favorite
        conversion pairs.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, broken conversion reports, or feedback:{" "}
        <Link href="/contact" className="text-emerald-600">
          Contact form
        </Link>{" "}
        or email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Legal</h2>
      <p>
        Read our{" "}
        <Link href="/privacy" className="text-emerald-600">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-emerald-600">
          Terms of Service
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
