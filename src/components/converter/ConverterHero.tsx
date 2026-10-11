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
        </div>
      </div>
    </section>
  );
}
