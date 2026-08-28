"use client";

import { ArrowRight } from "lucide-react";
import { HOMEPAGE_POPULAR_PAIRS } from "@/lib/conversion-pairs";
import type { ConversionPair } from "@/lib/conversion-pairs";

type PopularPairsSectionProps = {
  activePair: ConversionPair | null;
  onSelectPair: (pair: ConversionPair) => void;
};

export function PopularPairsSection({
  activePair,
  onSelectPair,
}: PopularPairsSectionProps) {
  return (
    <section aria-labelledby="popular-pairs-heading">
      <h2
        id="popular-pairs-heading"
        className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground"
      >
        Popular conversions
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3">
        {HOMEPAGE_POPULAR_PAIRS.map((pair) => {
          const isActive =
            activePair?.from === pair.from && activePair?.to === pair.to;
          return (
            <button
              key={`${pair.from}-${pair.to}`}
              type="button"
              onClick={() => onSelectPair(pair)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-border bg-card hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              }`}
            >
              <span
                className={`font-mono text-xs uppercase ${
                  isActive
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground"
                }`}
              >
                {pair.from}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span
                className={`font-mono text-xs uppercase ${
                  isActive
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground"
                }`}
              >
                {pair.to}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
