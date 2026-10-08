"use client";

import { useState } from "react";
import { ArrowRight, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";

type ConverterHeroProps = {
  totalFormats?: number;
  categoryCount?: number;
  totalConversionPairs?: number;
  onUploadClick: () => void;
  onDropFiles?: (files: FileList) => void;
};

export function ConverterHero({
  totalFormats,
  totalConversionPairs,
  onUploadClick,
  onDropFiles,
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
      <div className="px-4 py-8 sm:px-10 sm:py-12 lg:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-14">
          <div className="mx-auto w-full max-w-xl min-w-0 text-center lg:mx-0 lg:text-left">
            <Badge
              variant="secondary"
              className="mb-4 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 sm:mb-5 sm:px-3 sm:text-[11px]"
            >
              <Sparkles className="mr-1.5 inline h-3 w-3" />
              Free · Fair limits · No watermarks
            </Badge>

            <h1
              id="converter-hero-heading"
              className="text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]"
            >
              Any file.
              <br />
              <span className="text-emerald-600 dark:text-emerald-400">
                Any format.
              </span>
            </h1>

            <p className="mt-3 text-base font-semibold tracking-tight text-foreground sm:mt-4 sm:text-xl">
              Drop it. Convert it. Download it.
            </p>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-lg">
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

            <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:mt-8 sm:flex-row sm:items-center lg:justify-start">
              <Button
                size="lg"
                className="h-11 w-full rounded-full bg-emerald-500 px-6 text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 sm:h-12 sm:w-auto sm:px-8 sm:text-base"
                onClick={onUploadClick}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload files
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full rounded-full border-border px-6 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:h-12 sm:w-auto sm:px-8 sm:text-base"
                onClick={() => setCurrentView("formats")}
              >
                Browse formats
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <p className="mx-auto mt-5 max-w-lg text-xs text-muted-foreground/80 lg:mx-0">
              Private by design — files are processed temporarily; downloads stay
              in your browser.
            </p>
          </div>

          {/* Product surface: dropzone fills the empty side without marketing clutter */}
          <button
            type="button"
            onClick={onUploadClick}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) {
                onDropFiles?.(e.dataTransfer.files);
              } else {
                onUploadClick();
              }
            }}
            className={`mx-auto hidden w-full max-w-sm shrink-0 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors lg:mx-0 lg:block ${
              dragOver
                ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30"
                : "border-border/80 bg-muted/20 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
            }`}
            aria-label="Drop files to upload"
          >
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${
                dragOver
                  ? "bg-emerald-500 shadow-emerald-500/40"
                  : "bg-emerald-500 shadow-emerald-500/30"
              }`}
            >
              <Upload className="h-7 w-7 text-white" aria-hidden />
            </div>
            <p className="text-base font-semibold text-foreground">
              {dragOver ? "Drop to upload" : "Drop files here"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              or click to browse
            </p>
            <p className="mt-4 text-[11px] text-muted-foreground/80">
              Images, PDF, video, audio & more
            </p>
          </button>
        </div>
      </div>
    </section>
  );
}
