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
              Drop images, video, documents, spreadsheets, audio, archives, and more —
              pick your output format and download in seconds.
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

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                Temp process on server
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Result stays in your browser
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground/80 max-w-lg mx-auto lg:mx-0">
              We process files temporarily to convert them — downloads are saved on your device, not kept as permanent cloud storage.
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
