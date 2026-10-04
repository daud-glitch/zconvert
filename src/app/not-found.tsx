import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPopularPairs } from "@/lib/conversion-pairs";
import { pairToSlug } from "@/lib/conversion-pairs";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Page not found — ${SITE_NAME}`,
  description: "That page does not exist. Browse every supported format and conversion pair instead.",
  robots: { index: false, follow: true },
};

/**
 * Root 404.
 *
 * Next already serves a real 404 status for unmatched routes, so this is not
 * about the status code — it is about not being a dead end. A crawler that
 * lands here gets working links back into the site instead of giving up.
 */
export default function NotFound() {
  const popular = getPopularPairs().slice(0, 12);

  return (
    <main className="container mx-auto px-4 py-16 sm:py-24">
      <div className="max-w-2xl mx-auto text-center">
        <p className="font-mono text-sm font-bold text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-4 text-muted-foreground">
          The file or format you were looking for isn&apos;t here. It may have
          been renamed, or the link may be out of date.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to converter
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/conversions">
              <Search className="mr-2 h-4 w-4" />
              Browse all formats
            </Link>
          </Button>
        </div>
      </div>

      {popular.length > 0 && (
        <section className="mt-14">
          <h2 className="text-center text-sm font-semibold text-muted-foreground">
            Popular conversions
          </h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {popular.map((pair) => (
              <li key={`${pair.from}-${pair.to}`}>
                <Link
                  href={`/${pairToSlug(pair.from, pair.to)}`}
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {pair.from.toUpperCase()} → {pair.to.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}