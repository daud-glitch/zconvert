"use client";

import { Sparkles } from "lucide-react";
import {
  getPopularPairs,
  POPULAR_PAIRS_DIRECTORY_COUNT,
} from "@/lib/conversion-pairs";
import { PopularPairsGrid } from "@/components/converter/PopularPairsGrid";

const directoryPairs = getPopularPairs(POPULAR_PAIRS_DIRECTORY_COUNT);

export function PopularConversionsSection() {
  return (
    <section
      aria-labelledby="popular-conversions-heading"
      className="mb-12 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm sm:p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2
            id="popular-conversions-heading"
            className="text-sm font-bold tracking-tight text-foreground sm:text-base"
          >
            Popular Conversions
          </h2>
          <p className="text-[11px] text-muted-foreground truncate">
            Tap a pair to open the converter with both formats selected
          </p>
        </div>
      </div>

      <PopularPairsGrid pairs={directoryPairs} variant="link" />
    </section>
  );
}
