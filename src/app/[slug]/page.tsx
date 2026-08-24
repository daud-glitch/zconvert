import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getOptionalDb } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { ArrowLeft } from "lucide-react";
import {
  parseConversionSlug,
  getAllConversionPairSlugs,
} from "@/lib/conversion-pairs";
import {
  conversionPairTitle,
  conversionPairDescription,
  absoluteUrl,
  OG_IMAGE_PATH,
  SITE_NAME,
} from "@/lib/seo";
import ConversionPairClient from "@/components/pages/ConversionPairClient";
import ConversionPairJsonLd from "@/components/seo/ConversionPairJsonLd";

const RESERVED = new Set([
  "api",
  "login",
  "conversions",
  "admin",
  "dashboard",
  "settings",
  "bookmarks",
  "profile",
  "system",
  "core",
  "privacy",
  "terms",
  "contact",
  "about",
  "changelog",
  "forgot-password",
  "reset-password",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "_next",
]);

type Props = { params: Promise<{ slug: string }> };

async function loadPage(slug: string) {
  if (!slug || RESERVED.has(slug) || !/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }
  const prisma = getOptionalDb();
  if (!prisma) return null;
  return prisma.page.findFirst({
    where: { slug, enabled: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Conversion pair metadata
  const pair = parseConversionSlug(slug);
  if (pair) {
    const title = conversionPairTitle(pair.from.ext, pair.to.ext);
    const description = conversionPairDescription(
      pair.from.ext,
      pair.from.name,
      pair.to.ext,
      pair.to.name,
    );
    const fromUpper = pair.from.ext.toUpperCase();
    const toUpper = pair.to.ext.toUpperCase();
    const path = `/${slug}`;
    return {
      title,
      description,
      keywords: [
        `${fromUpper} to ${toUpper}`,
        `convert ${fromUpper} to ${toUpper}`,
        `${fromUpper} to ${toUpper} converter`,
        `free ${fromUpper} to ${toUpper} converter`,
        `online ${fromUpper} to ${toUpper} converter`,
        `convert ${pair.from.ext} to ${pair.to.ext} free`,
        `${pair.from.name} to ${pair.to.name} converter`,
        "file converter",
        "free online converter",
        SITE_NAME,
      ],
      alternates: { canonical: path },
      openGraph: {
        title,
        description,
        url: absoluteUrl(path),
        type: "website",
        siteName: SITE_NAME,
        images: [
          {
            url: OG_IMAGE_PATH,
            width: 1200,
            height: 630,
            alt: `Convert ${fromUpper} to ${toUpper} online free with ${SITE_NAME}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [OG_IMAGE_PATH],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    };
  }

  // CMS page metadata
  const page = await loadPage(slug);
  if (!page) {
    return {
      title: "Not found",
      robots: { index: false, follow: false },
    };
  }
  const title = page.seoTitle || page.title;
  const description = page.seoDesc || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://www.convertek.tech/${slug}`,
      type: "article",
    },
    robots: { index: true, follow: true },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;

  // Conversion pair route
  const pair = parseConversionSlug(slug);
  if (pair) {
    return (
      <>
        <ConversionPairJsonLd
          fromExt={pair.from.ext}
          fromName={pair.from.name}
          toExt={pair.to.ext}
          toName={pair.to.name}
          slug={slug}
        />
        <ConversionPairClient pair={pair} />
      </>
    );
  }

  // CMS page route
  const page = await loadPage(slug);
  if (!page) notFound();

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(page.content);

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 w-full bg-emerald-500" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Converter
        </Link>
        <article>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {page.title}
          </h1>
          <div className="mt-8 prose prose-neutral dark:prose-invert max-w-none">
            {looksLikeHtml ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(page.content),
                }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {page.content}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return getAllConversionPairSlugs().map((slug) => ({ slug }));
}
