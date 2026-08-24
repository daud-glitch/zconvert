import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { changelogEntries } from "@/lib/changelog";
import { OG_IMAGE_PATH } from "@/lib/seo";

const SITE = "https://www.convertek.tech";
const UPDATED = "August 24, 2026";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Convertek changelog — conversion fixes and product updates for the free online file converter.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Changelog | Convertek",
    description:
      "See recent conversion fixes and product updates on Convertek.",
    url: `${SITE}/changelog`,
    type: "website",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog | Convertek",
    description: "Recent conversion fixes and product updates.",
  },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ChangelogPage() {
  return (
    <LegalPageShell title="Changelog" updated={UPDATED}>
      <p>
        User-facing conversion fixes and product updates. We log issues that
        affected converting or downloading files so you can see what was
        resolved.
      </p>

      {changelogEntries.map((entry) => (
        <section key={entry.date}>
          <h2>
            {formatDate(entry.date)} — {entry.title}
          </h2>
          <ul>
            {entry.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </LegalPageShell>
  );
}
