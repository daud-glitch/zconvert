import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ScrollText, Sparkles, Wrench } from "lucide-react";
import { PageHero } from "@/components/common/PageHero";
import { changelogEntries } from "@/lib/changelog";
import { OG_IMAGE_PATH } from "@/lib/seo";
import { SiteFooter } from "@/components/common/SiteFooter";
import { SiteHeader } from "@/components/common/SiteHeader";

const SITE = "https://www.convertek.tech";
/** Owned by the data — never hand-maintained alongside it. */
const UPDATED = formatDate(changelogEntries[0].date);

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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHero
          breadcrumb={[
            { href: "/", label: "Home" },
            { href: "/changelog", label: "Changelog" },
          ]}
          eyebrow="Product updates"
          eyebrowIcon={<ScrollText className="h-4 w-4" aria-hidden />}
          title="Changelog"
          lead="User-facing conversion fixes and product updates. We log issues that affected converting or downloading files so you can see what was resolved."
        >
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {UPDATED}
          </p>
        </PageHero>

        <section>
          <div className="mb-5 flex items-center gap-2">
            <Sparkles
              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Recent releases
            </h2>
          </div>

          <div className="space-y-4">
            {changelogEntries.map((entry, index) => (
              <article
                key={entry.id}
                className="relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-emerald-500/50"
              >
                {index === 0 && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    Latest
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <time
                    dateTime={entry.date}
                    className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
                  >
                    {formatDate(entry.date)}
                  </time>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    {entry.title}
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {entry.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-6 text-center sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
              <ScrollText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Found a broken conversion?
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Tell us via the{" "}
                <Link
                  href="/contact"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                >
                  contact form
                </Link>{" "}
                — include the input format, target format, and what went wrong.
                We fix real-world uploads as fast as we can.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Or read{" "}
                <Link
                  href="/about"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                >
                  about Convertek
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <p className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:text-left">
          Convertek ·{" "}
          <a
            href={SITE}
            className="text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            www.convertek.tech
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
