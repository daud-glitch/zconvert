import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { PageIntro } from "@/components/common/PageIntro";
import { FileIllustration } from "@/components/common/FileIllustration";
import { getFormatByExt } from "@/lib/formats";
import { SiteFooter } from "@/components/common/SiteFooter";
import { SiteHeader } from "@/components/common/SiteHeader";
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
      <SiteHeader />
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

        <PageIntro
          title="File conversion guides"
          description="Choose the right file format, understand what a conversion changes, and get better results with practical settings."
          icons={<FileIllustration type="ebook" />}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {list.map((guide) => {
            const extension = guide.related[0]?.from ?? guide.relatedFormats[0];
            return (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-emerald-500/50 hover:bg-muted/30"
              >
                <FileIllustration className="mb-4" extension={extension} type={getFormatByExt(extension ?? "")?.category} />
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
            );
          })}
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
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
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
