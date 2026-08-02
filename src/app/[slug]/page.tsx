import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getOptionalDb } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { ArrowLeft } from "lucide-react";

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
  const page = await loadPage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: page.seoTitle || page.title,
    description: page.seoDesc || undefined,
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
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
