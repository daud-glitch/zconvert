import { type ResolvedPair } from "@/lib/conversion-pairs";
import { pairGuideSection, pairTips } from "@/lib/pair-guide";
import { ArrowRight } from "lucide-react";

/**
 * Editorial blocks for a conversion pair page.
 *
 * Content comes from `@/lib/pair-guide` — derived from the two formats'
 * categories — so each pair page carries text about that specific conversion
 * rather than a shared template. This is the page's answer to AdSense's
 * "thin content" flag: the page now explains what actually changes between
 * the two formats instead of only restating the extension names.
 */
export function PairGuideSection({ pair }: { pair: ResolvedPair }) {
  const guide = pairGuideSection(pair.from, pair.to);
  const tips = pairTips(pair.from, pair.to);

  return (
    <>
      <section className="mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="mb-3 text-2xl font-bold tracking-tight">
          {guide.heading}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {guide.intro}
        </p>

        <div className="space-y-6">
          {guide.points.map((point) => (
            <div key={point.title}>
              <h3 className="mb-1.5 flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {point.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {point.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          {tips.heading}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {tips.points.map((tip, i) => (
            <div
              key={tip.title}
              className="rounded-2xl border border-border bg-muted/20 p-5"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-foreground">
                  {tip.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {tip.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** Small "next step" list used under the guide, linking to real pair pages. */
export function PairInlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </a>
  );
}
