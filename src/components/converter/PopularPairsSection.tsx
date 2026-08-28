"use client";

import {
  ArrowRight,
  BookOpen,
  Database,
  FileImage,
  FileText,
  Film,
  Music,
  Sparkles,
  Subtitles,
  Type,
  Archive,
  Layout,
  FileQuestion,
} from "lucide-react";
import { HOMEPAGE_POPULAR_PAIRS } from "@/lib/conversion-pairs";
import type { ConversionPair } from "@/lib/conversion-pairs";
import { getCategoryFromExt } from "@/lib/app-helpers";
import type { LucideIcon } from "lucide-react";

type PopularPairsSectionProps = {
  activePair: ConversionPair | null;
  onSelectPair: (pair: ConversionPair) => void;
};

const categoryIconMap: Record<string, LucideIcon> = {
  image: FileImage,
  video: Film,
  audio: Music,
  document: FileText,
  data: Database,
  archive: Archive,
  ebook: BookOpen,
  presentation: Layout,
  subtitle: Subtitles,
  font: Type,
  other: FileQuestion,
};

const categoryTone: Record<string, string> = {
  image: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  video: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  audio: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  document: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  data: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  archive: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  ebook: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  presentation: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  subtitle: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  font: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  other: "bg-muted text-muted-foreground",
};

function FormatBadge({ ext }: { ext: string }) {
  const category = getCategoryFromExt(ext) || "other";
  const Icon = categoryIconMap[category] ?? FileQuestion;
  const tone = categoryTone[category] ?? categoryTone.other;

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

export function PopularPairsSection({
  activePair,
  onSelectPair,
}: PopularPairsSectionProps) {
  return (
    <section
      aria-labelledby="popular-pairs-heading"
      className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2
            id="popular-pairs-heading"
            className="text-base font-bold tracking-tight text-foreground"
          >
            Popular conversions
          </h2>
          <p className="text-xs text-muted-foreground">
            Tap a pair — formats auto-select in the converter
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3">
        {HOMEPAGE_POPULAR_PAIRS.map((pair) => {
          const isActive =
            activePair?.from === pair.from && activePair?.to === pair.to;
          return (
            <button
              key={`${pair.from}-${pair.to}`}
              type="button"
              onClick={() => onSelectPair(pair)}
              className={`group flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition-all sm:px-3 ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500/20 dark:bg-emerald-950/30"
                  : "border-border/70 bg-background/80 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/15"
              }`}
            >
              <div className="flex items-center gap-2">
                <FormatBadge ext={pair.from} />
                <ArrowRight
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/60 group-hover:text-emerald-500"
                  }`}
                  aria-hidden
                />
                <FormatBadge ext={pair.to} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground sm:text-xs">
                {pair.from}
                <span className="mx-1 font-normal text-muted-foreground">→</span>
                {pair.to}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
