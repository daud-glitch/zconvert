"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pairToSlug, type ConversionPair } from "@/lib/conversion-pairs";
import { FormatChip } from "@/components/converter/FormatChip";

type PopularPairsGridProps = {
  pairs: ConversionPair[];
  variant: "select" | "link";
  activePair?: ConversionPair | null;
  onSelectPair?: (pair: ConversionPair) => void;
};

function pairCellClass(isActive: boolean): string {
  return `group flex items-center justify-center gap-1 rounded-lg border px-2 py-2 transition-all ${
    isActive
      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/25 dark:bg-emerald-950/30"
      : "border-border/60 bg-background/80 hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
  }`;
}

function PairArrow({ isActive }: { isActive: boolean }) {
  return (
    <ArrowRight
      className={`h-3 w-3 shrink-0 ${
        isActive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground/50 group-hover:text-emerald-500"
      }`}
      aria-hidden
    />
  );
}

export function PopularPairsGrid({
  pairs,
  variant,
  activePair = null,
  onSelectPair,
}: PopularPairsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-2">
      {pairs.map((pair) => {
        const isActive =
          activePair?.from === pair.from && activePair?.to === pair.to;

        const content = (
          <>
            <FormatChip ext={pair.from} />
            <PairArrow isActive={isActive} />
            <FormatChip ext={pair.to} />
          </>
        );

        if (variant === "link") {
          return (
            <Link
              key={`${pair.from}-${pair.to}`}
              href={`/${pairToSlug(pair.from, pair.to)}`}
              className={pairCellClass(false)}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={`${pair.from}-${pair.to}`}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectPair?.(pair)}
            className={pairCellClass(isActive)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
