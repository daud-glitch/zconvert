import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Clock } from "lucide-react";
import { SiteFooter } from "@/components/common/SiteFooter";
import { guides } from "@/lib/guides";
import { SITE_NAME, SITE_URL, OG_IMAGE_PATH } from "@/lib/seo";

const title = `File Conversion Guides — ${SITE_NAME}`;
const description =
  "Practical, original guides to file formats: choosing between PNG, JPG, WebP and AVIF, converting iPhone HEIC photos, photos and scans to PDF, PDF to images at the right resolution, DOCX to PDF fidelity, extracting audio from video, CSV vs JSON, and subtitle formats.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  keywords: [
    "file conversion guides",
    "image format guide",
    "pdf conversion guide",
    "data format guide",
    SITE_NAME,
  ],
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/guides`,
    type: "website",
    siteName: SITE_NAME,
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [OG_IMAGE_PATH],
  },
  robots: { index: true, follow: true },
};

export default function GuidesIndexPage() {
  const list = [...guides].sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <>
      <div className="h-1 w-full bg-emerald-500" />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </nav>

        <div className="mb-10 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            <BookOpen className="h-4 w-4" />
            Guides
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            File conversion guides
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Decisions you actually have to make when converting files — which
            format to pick, what a conversion throws away, and how to avoid the
            mistakes that quietly ruin an output. Written for Convertek&apos;s
            supported formats, and each guide links straight to the converters
            it discusses.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {list.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-emerald-500/50 hover:bg-muted/30"
            >
              <h2 className="text-lg font-semibold leading-snug text-foreground group-hover:text-emerald-600">
                {guide.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {guide.description}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {guide.readingMinutes} min read
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  Read guide
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-14 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <h2 className="text-lg font-semibold">
            Ready to convert something?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every guide ends in a converter — or start from the full format
            directory.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Open the converter
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/conversions"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-muted"
            >
              Browse all formats
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
