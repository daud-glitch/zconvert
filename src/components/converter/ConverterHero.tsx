"use client";

import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Upload,
  FileImage,
  FileText,
  Video,
  Music,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { type ConversionPair } from "@/lib/conversion-pairs";

type ConverterHeroProps = {
  totalFormats?: number;
  categoryCount?: number;
  totalConversionPairs?: number;
  onUploadClick: () => void;
  onDropFiles?: (files: FileList) => void;
  onSelectPair?: (pair: ConversionPair) => void;
};

const POPULAR_HUBS = [
  {
    category: "Images",
    icon: FileImage,
    accent: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    pairs: [
      { from: "png", to: "webp" },
      { from: "jpg", to: "png" },
      { from: "heic", to: "jpg" },
    ],
  },
  {
    category: "Documents",
    icon: FileText,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    pairs: [
      { from: "pdf", to: "docx" },
      { from: "docx", to: "pdf" },
      { from: "pdf", to: "txt" },
    ],
  },
  {
    category: "Media",
    icon: Video,
    accent: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    pairs: [
      { from: "mp4", to: "mp3" },
      { from: "mkv", to: "mp4" },
      { from: "wav", to: "mp3" },
    ],
  },
];

export function ConverterHero({
  totalFormats,
  totalConversionPairs,
  onUploadClick,
  onDropFiles,
  onSelectPair,
}: ConverterHeroProps) {
  const { setCurrentView } = useApp();
  const formatCount = totalFormats ?? 0;
  const pairCount = totalConversionPairs ?? 0;
  const [dragOver, setDragOver] = useState(false);

  return (
    <section
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:rounded-3xl"
      aria-labelledby="converter-hero-heading"
    >
      <div className="px-4 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="mx-auto w-full max-w-xl min-w-0 text-center lg:mx-0 lg:text-left">
            <Badge
              variant="secondary"
              className="mb-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 sm:mb-3 sm:px-3 sm:text-[11px]"
            >
              <Sparkles className="mr-1.5 inline h-3 w-3" />
              Free · Fair limits · No watermarks
            </Badge>

            <h1
              id="converter-hero-heading"
              className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
            >
              Any file.{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                Any format.
              </span>
            </h1>

            <p className="mt-1.5 text-sm font-semibold tracking-tight text-foreground sm:mt-2 sm:text-base">
              Drop it. Convert it. Download it.
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:mt-1.5 sm:text-sm">
              Drop files, pick an output format, download in seconds.
              {formatCount > 0 && (
                <>
                  {" "}
                  <span className="font-medium text-foreground">
                    {formatCount}+ formats
                  </span>
                  {pairCount > 0 && <> · {pairCount.toLocaleString()}+ pairs</>}.
                </>
              )}
            </p>

            <div className="mt-4 flex flex-col items-stretch gap-2 sm:mt-5 sm:flex-row sm:items-center lg:justify-start">
              <Button
                size="default"
                className="h-10 w-full rounded-full bg-emerald-500 px-6 text-sm font-semibold shadow-md shadow-emerald-500/20 hover:bg-emerald-600 sm:w-auto"
                onClick={onUploadClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Select files to convert
              </Button>
              <Button
                size="default"
                variant="outline"
                className="h-10 w-full rounded-full border-border px-5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:w-auto"
                onClick={() => setCurrentView("formats")}
              >
                Browse formats
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>

            <p className="mx-auto mt-3 max-w-lg text-[11px] text-muted-foreground/80 sm:text-xs lg:mx-0">
              Private by design — files are processed temporarily; downloads stay
              in your browser.
            </p>
          </div>

          {/* ─── Desktop Right Side: Quick Format Hub ─── */}
          <div className="hidden lg:flex flex-col w-full max-w-sm shrink-0 rounded-2xl border border-border/80 bg-muted/20 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold tracking-tight text-foreground uppercase">
                  Quick Format Hub
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                One-click preset
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              {POPULAR_HUBS.map((hub) => {
                const Icon = hub.icon;
                return (
                  <div key={hub.category} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                      <span className={`p-1 rounded-md border ${hub.accent}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <span>{hub.category}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {hub.pairs.map((p) => (
                        <button
                          key={`${p.from}-${p.to}`}
                          type="button"
                          onClick={() => {
                            if (onSelectPair) {
                              onSelectPair(p);
                            } else {
                              onUploadClick();
                            }
                          }}
                          className="group flex items-center justify-center gap-1 rounded-lg border border-border/70 bg-background/90 px-2 py-1.5 text-center text-[11px] font-semibold transition-all hover:border-emerald-500/60 hover:bg-emerald-50/70 hover:shadow-xs dark:hover:bg-emerald-950/30"
                          title={`Convert .${p.from} to .${p.to}`}
                        >
                          <span className="font-mono text-muted-foreground group-hover:text-foreground uppercase text-[10px]">
                            {p.from}
                          </span>
                          <ArrowRightLeft className="h-2.5 w-2.5 text-muted-foreground/60 group-hover:text-emerald-500" />
                          <span className="font-mono text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-bold uppercase text-[10px]">
                            {p.to}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Over 2,300+ format pairs</span>
              <button
                type="button"
                onClick={() => setCurrentView("formats")}
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
              >
                All formats
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
