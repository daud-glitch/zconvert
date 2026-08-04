"use client";

import {
  ArrowRight,
  FileImage,
  FileText,
  Database,
  Music,
  Sparkles,
  Upload,
  Film,
  Type,
  Captions,
  Archive,
  Presentation,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { formatMaxUploadLabel } from "@/lib/upload-limits";

const FLOATING_FORMATS = [
  {
    ext: "PNG",
    chip: "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    ext: "JPG",
    chip: "border-lime-400/40 bg-lime-500/15 text-lime-700 dark:text-lime-300",
  },
  {
    ext: "WEBP",
    chip: "border-teal-400/40 bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  {
    ext: "AVIF",
    chip: "border-cyan-400/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  {
    ext: "PDF",
    chip: "border-rose-400/45 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  {
    ext: "DOCX",
    chip: "border-sky-400/45 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    ext: "MD",
    chip: "border-indigo-400/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  },
  {
    ext: "CSV",
    chip: "border-orange-400/45 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  {
    ext: "JSON",
    chip: "border-amber-400/45 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  },
  {
    ext: "MP3",
    chip: "border-violet-400/45 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    ext: "MP4",
    chip: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  },
  {
    ext: "ZIP",
    chip: "border-yellow-400/45 bg-yellow-500/15 text-yellow-800 dark:text-yellow-300",
  },
  {
    ext: "WAV",
    chip: "border-pink-400/40 bg-pink-500/15 text-pink-700 dark:text-pink-300",
  },
];

const CATEGORY_ICONS = [
  { icon: FileImage, label: "Image", color: "text-emerald-500" },
  { icon: FileText, label: "Document", color: "text-sky-500" },
  { icon: Database, label: "Data", color: "text-rose-500" },
  { icon: Music, label: "Audio", color: "text-amber-500" },
  { icon: Film, label: "Video", color: "text-fuchsia-500" },
  { icon: Type, label: "Fonts", color: "text-pink-500" },
  { icon: Captions, label: "Subtitle", color: "text-cyan-500" },
  { icon: Archive, label: "Archive", color: "text-slate-500" },
  { icon: Presentation, label: "Presentation", color: "text-orange-500" },
  { icon: BookOpen, label: "Ebooks", color: "text-teal-500" },
];

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
      <div className="px-4 py-8 sm:px-10 sm:py-14 lg:px-14">
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

          <div className="hidden lg:flex w-[320px] shrink-0 flex-col items-center gap-3">
            {/* Neat rows of format chips — no random scatter / overlap */}
            <div className="flex w-full flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {FLOATING_FORMATS.slice(0, 4).map((chip) => (
                  <span
                    key={chip.ext}
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide shadow-sm ${chip.chip}`}
                  >
                    .{chip.ext}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {FLOATING_FORMATS.slice(4, 9).map((chip) => (
                  <span
                    key={chip.ext}
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide shadow-sm ${chip.chip}`}
                  >
                    .{chip.ext}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {FLOATING_FORMATS.slice(9).map((chip) => (
                  <span
                    key={chip.ext}
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide shadow-sm ${chip.chip}`}
                  >
                    .{chip.ext}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background p-3 shadow-sm">
              {CATEGORY_ICONS.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl bg-muted/55 px-2.5 py-2.5 text-[13px] font-medium leading-tight"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
              className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3 text-center"
            >
              <p className="text-xl font-bold tracking-tight sm:text-2xl">
                {stat.value}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
