"use client";

import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import type { ConversionPair } from "@/lib/conversion-pairs";
import { getFormatChipClass } from "@/lib/format-chips";
import { usePopularPairs } from "@/hooks/use-popular-pairs";

type PopularPairsSectionProps = {
  activePair: ConversionPair | null;
  onSelectPair: (pair: ConversionPair) => void;
};

function ExtChip({ ext }: { ext: string }) {
  return (
    <span
      className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getFormatChipClass(ext)}`}
    >
      {ext}
    </span>
  );
}

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

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 sm:gap-2">
        {pairs.map((pair) => {
          const isActive =
            activePair?.from === pair.from && activePair?.to === pair.to;
          return (
            <button
              key={`${pair.from}-${pair.to}`}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectPair({ from: pair.from, to: pair.to })}
              className={`group flex items-center justify-center gap-1 rounded-lg border px-2 py-2 transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/25 dark:bg-emerald-950/30"
                  : "border-border/60 bg-background/80 hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
              }`}
            >
              <ExtChip ext={pair.from} />
              <ArrowRight
                className={`h-3 w-3 shrink-0 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/50 group-hover:text-emerald-500"
                }`}
                aria-hidden
              />
              <ExtChip ext={pair.to} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
