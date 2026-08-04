"use client";

import {
  ArrowRight,
  FileImage,
  FileText,
  Database,
  Music,
  Shield,
  Sparkles,
  Upload,
  Zap,
  Layers,
  ArrowRightLeft,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { formatMaxUploadLabel } from "@/lib/upload-limits";

const FLOATING_FORMATS = [
  { ext: "PNG", pos: "top-[18%] right-[8%]" },
  { ext: "PDF", pos: "top-[42%] right-[18%]" },
  { ext: "MP3", pos: "bottom-[28%] right-[6%]" },
  { ext: "WEBP", pos: "top-[28%] right-[28%]" },
  { ext: "CSV", pos: "bottom-[18%] right-[22%]" },
];

const CATEGORY_ICONS = [
  { icon: FileImage, label: "Image", color: "text-emerald-500" },
  { icon: FileText, label: "Document", color: "text-sky-500" },
  { icon: Database, label: "Data", color: "text-rose-500" },
  { icon: Music, label: "Audio", color: "text-amber-500" },
];

const WHY_CARDS = [
  {
    icon: Layers,
    title: "Mixed-type batch",
    desc: "PNG + PDF + MP3 in one queue — different target format per file.",
    tint: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/15",
  },
  {
    icon: ArrowRightLeft,
    title: "Per-file formats",
    desc: "Pick WebP for one image, DOCX for another — no same-format lock-in.",
    tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/15",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Server engines convert; results download in seconds.",
    tint: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/15",
  },
  {
    icon: Shield,
    title: "Privacy-first",
    desc: "Temp process only — files stay in your browser after.",
    tint: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
    ring: "ring-teal-500/15",
  },
  {
    icon: HardDrive,
    title: "Clear limits",
    desc: `Up to ${formatMaxUploadLabel()} · 20 files / batch · no watermarks.`,
    tint: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/15",
  },
] as const;

type ConverterHeroProps = {
  totalFormats?: number;
  categoryCount?: number;
  totalConversionPairs?: number;
  onUploadClick: () => void;
};

export function ConverterHero({
  totalFormats,
  categoryCount,
  totalConversionPairs,
  onUploadClick,
}: ConverterHeroProps) {
  const { setCurrentView } = useApp();
  const formatCount = totalFormats ?? 0;
  const activeCategories = categoryCount ?? 0;
  const pairCount = totalConversionPairs ?? 0;

  return (
    <section
      className="rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm w-full min-w-0 overflow-hidden"
      aria-labelledby="converter-hero-heading"
    >
      <div className="px-4 py-8 sm:px-10 sm:py-12 lg:px-14">
        <div className="flex flex-col gap-8 sm:gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full max-w-2xl min-w-0 text-center lg:text-left">
            <Badge
              variant="secondary"
              className="mb-4 sm:mb-5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"
            >
              <Sparkles className="mr-1.5 inline h-3 w-3" />
              Free · Fair limits · No watermarks
            </Badge>

            <h1
              id="converter-hero-heading"
              className="text-[1.75rem] leading-tight font-extrabold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]"
            >
              Convert any file.
              <br />
              <span className="text-emerald-600 dark:text-emerald-400">
                Any format.
              </span>
            </h1>

            <p className="mt-3 sm:mt-4 text-sm leading-relaxed text-muted-foreground sm:text-lg">
              Drop images, video, documents, spreadsheets, audio, archives — even
              mixed types in one batch. Choose a different output format for each
              file, then download in seconds.
              {formatCount > 0 && (
                <>
                  {" "}
                  <span className="font-medium text-foreground">
                    {formatCount}+ formats
                  </span>
                  {activeCategories > 0 && (
                    <> across {activeCategories} categories</>
                  )}
                  {pairCount > 0 && (
                    <>
                      {" "}
                      &middot;{" "}
                      <span className="font-medium text-foreground">
                        {pairCount.toLocaleString()}+ conversion pairs
                      </span>
                    </>
                  )}
                  .
                </>
              )}
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col items-stretch sm:items-center gap-2.5 sm:gap-3 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className="h-11 sm:h-12 w-full sm:w-auto rounded-full bg-emerald-500 px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-lg shadow-emerald-500/25 hover:bg-emerald-600"
                onClick={onUploadClick}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload files
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 sm:h-12 w-full sm:w-auto rounded-full px-6 sm:px-8 text-sm sm:text-base"
                onClick={() => setCurrentView("formats")}
              >
                Browse all formats
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <p className="mt-5 text-xs text-muted-foreground/80 max-w-lg mx-auto lg:mx-0">
              Files are processed temporarily on the server. Converted downloads
              stay in your browser (IndexedDB). We may keep anonymized usage
              stats only — not your file library.
            </p>
          </div>

          <div className="hidden lg:block relative w-[280px] shrink-0 h-[220px]">
            {FLOATING_FORMATS.map((chip) => (
              <span
                key={chip.ext}
                className={`absolute ${chip.pos} rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs font-bold tracking-wide shadow-md`}
              >
                .{chip.ext}
              </span>
            ))}
            <div className="absolute inset-x-4 bottom-0 grid grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-background p-3">
              {CATEGORY_ICONS.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs font-medium"
                >
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {[
            {
              value: formatCount > 0 ? `${formatCount}+` : "—",
              label: "Formats",
            },
            {
              value: activeCategories > 0 ? String(activeCategories) : "—",
              label: "Categories",
            },
            { value: "20", label: "Files per batch" },
            { value: formatMaxUploadLabel(), label: "Max file size" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 text-center"
            >
              <p className="text-lg font-bold tracking-tight sm:text-xl">
                {stat.value}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Why Cloud Converter — compact cards under hero */}
        <div className="mt-8 border-t border-border/60 pt-6">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight sm:text-[15px]">
              Why Cloud Converter?
            </h2>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              Mixed-type batch · per-file formats
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {WHY_CARDS.map(({ icon: Icon, title, desc, tint, ring }) => (
              <div
                key={title}
                className={`group rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 ring-1 ${ring} transition-colors hover:bg-muted/30`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tint}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold leading-snug tracking-tight">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
                      {desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
