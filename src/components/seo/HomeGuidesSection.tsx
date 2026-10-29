import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

/** Metadata for a guide card — bodies stay server-side in lib/guides. */
export type GuideTeaser = {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
};

/**
 * Homepage entry point to the editorial guides.
 *
 * The converter is the hero, so this sits below it: visitors who are unsure
 * which format to pick get a decision guide, and every guide links back into
 * the pair pages it discusses.
 */
export function HomeGuidesSection({ guides }: { guides: GuideTeaser[] }) {
  if (guides.length === 0) return null;

  return (
    <section
      id="guides"
      aria-labelledby="guides-heading"
      className="border-t border-border/40 bg-muted/20 py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              <BookOpen className="h-4 w-4" aria-hidden />
              Guides
            </div>
            <h2
              id="guides-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Pick the right format before you convert
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              What each format keeps, what it throws away, and when converting is
              the wrong move — written for the formats this converter supports.
            </p>
          </div>
          <Link
            href="/guides"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
          >
            All guides
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-emerald-500/50 hover:bg-background"
            >
              <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-emerald-600">
                {guide.title}
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                {guide.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                {guide.readingMinutes} min read
                <ArrowRight
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
