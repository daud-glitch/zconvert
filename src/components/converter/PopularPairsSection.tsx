"use client";

import { Sparkles, TrendingUp } from "lucide-react";
import type { ConversionPair } from "@/lib/conversion-pairs";
import { usePopularPairs } from "@/hooks/use-popular-pairs";
import { PopularPairsGrid } from "@/components/converter/PopularPairsGrid";

type PopularPairsSectionProps = {
  activePair: ConversionPair | null;
  onSelectPair: (pair: ConversionPair) => void;
};

export function PopularPairsSection({
  activePair,
  onSelectPair,
}: PopularPairsSectionProps) {
  const { pairs, source } = usePopularPairs();

  return (
    <section
      aria-labelledby="popular-pairs-heading"
      className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2
              id="popular-pairs-heading"
              className="text-sm font-bold tracking-tight text-foreground sm:text-base"
            >
              Popular conversions
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              Tap to select · tap again to clear
              {source === "live" ? " · live rankings" : ""}
            </p>
          </div>
        </div>
        {source === "live" && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-3 w-3" aria-hidden />
            Live
          </span>
        )}
      </div>

      <PopularPairsGrid
        pairs={pairs}
        variant="select"
        activePair={activePair}
        onSelectPair={onSelectPair}
      />
    </section>
  );
}
