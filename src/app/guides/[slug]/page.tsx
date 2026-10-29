import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
} from "lucide-react";
import { SiteFooter } from "@/components/common/SiteFooter";
import { SiteHeader } from "@/components/common/SiteHeader";
import { getGuide, getGuideSlugs } from "@/lib/guides";
import { getFormatByExt } from "@/lib/formats";
import { absoluteUrl, OG_IMAGE_PATH, SITE_NAME } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found", robots: { index: false } };

  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: absoluteUrl(`/guides/${guide.slug}`),
      type: "article",
      siteName: SITE_NAME,
      publishedTime: guide.updated,
      modifiedTime: guide.updated,
      images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
      images: [OG_IMAGE_PATH],
    },
    robots: { index: true, follow: true },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const updated = new Date(guide.updated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.updated,
    dateModified: guide.updated,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="h-1 w-full bg-emerald-500" />
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/guides" className="hover:text-foreground">
            Guides
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">
            {guide.keywords[0] ?? guide.title}
          </span>
        </nav>

        <article>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {guide.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Updated {updated}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {guide.readingMinutes} min read
            </span>
          </div>

          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {guide.lead}
          </p>

          <div className="mt-10 space-y-10">
            {guide.blocks.map((block) => (
              <section key={block.heading}>
                <h2 className="text-xl font-semibold text-foreground">
                  {block.heading}
                </h2>
                <div className="mt-3 space-y-4">
                  {block.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {p}
                    </p>
                  ))}
                </div>
                {block.list && block.list.length > 0 && (
                  <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                    {block.list.map((item) => (
                      <div key={item.term} className="px-5 py-4">
                        <dt className="text-sm font-semibold text-foreground">
                          {item.term}
                        </dt>
                        <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {item.text}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            ))}
          </div>

          {guide.related.length > 0 && (
            <section className="mt-12 rounded-2xl border border-border bg-muted/20 p-6">
              <h2 className="text-lg font-semibold">
                Convert with these guides&apos; formats
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {guide.related.map((pair) => (
                  <li key={`${pair.from}-to-${pair.to}`}>
                    <Link
                      href={`/${pair.from}-to-${pair.to}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 font-mono text-xs font-semibold uppercase transition-colors hover:border-emerald-500 hover:text-emerald-600"
                    >
                      {pair.from}
                      <ArrowRight className="h-3 w-3" />
                      {pair.to}
                    </Link>
                  </li>
                ))}
              </ul>

              {guide.relatedFormats.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Format pages
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                    {guide.relatedFormats
                      .filter((ext) => getFormatByExt(ext))
                      .map((ext) => (
                        <li key={ext}>
                          <Link
                            href={`/conversions/${ext}`}
                            className="text-emerald-600 hover:underline"
                          >
                            .{ext} converter
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {guide.faqs.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-semibold">Frequently asked questions</h2>
              <div className="mt-4 space-y-4">
                {guide.faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <h3 className="text-sm font-semibold">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <nav
            aria-label="More guides"
            className="mt-12 border-t border-border pt-6"
          >
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/guides"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                All guides
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"
              >
                Open the converter
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
