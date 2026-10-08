"use client";

import { useEffect, useState } from "react";
import { ArrowRight, RefreshCw, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import type { ConversionPair } from "@/lib/conversion-pairs";
import { usePopularPairs } from "@/hooks/use-popular-pairs";

const ROTATE_MS = 3500;

type ConverterHeroProps = {
  totalFormats?: number;
  categoryCount?: number;
  totalConversionPairs?: number;
  onUploadClick: () => void;
  onSelectPair?: (pair: ConversionPair) => void;
};

export function ConverterHero({
  totalFormats,
  totalConversionPairs,
  onUploadClick,
  onSelectPair,
}: ConverterHeroProps) {
  const { setCurrentView } = useApp();
  const { pairs } = usePopularPairs();
  const formatCount = totalFormats ?? 0;
  const pairCount = totalConversionPairs ?? 0;

  const previewPairs = pairs.length > 0 ? pairs.slice(0, 8) : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || previewPairs.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % previewPairs.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused, previewPairs.length]);

  // Keep index in range when the list refreshes.
  useEffect(() => {
    if (index >= previewPairs.length) setIndex(0);
  }, [index, previewPairs.length]);

  const active = previewPairs[index] ?? previewPairs[0] ?? null;

  return (
    <section
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:rounded-3xl"
      aria-labelledby="converter-hero-heading"
    >
      <div className="px-4 py-8 sm:px-10 sm:py-12 lg:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="mx-auto w-full max-w-2xl min-w-0 text-center lg:mx-0 lg:text-left">
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

          {active && (
            <aside
              className="mx-auto hidden w-full max-w-sm shrink-0 lg:mx-0 lg:block"
              aria-label="Example conversion pair"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocusCapture={() => setPaused(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setPaused(false);
                }
              }}
            >
              <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/30 p-5 shadow-sm sm:p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl"
                />
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Popular right now
                </p>

                <div
                  key={`${active.from}-${active.to}`}
                  className="flex items-center justify-center gap-3 transition-opacity duration-300"
                >
                  <span className="rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-lg font-bold uppercase tracking-wide shadow-sm sm:text-xl">
                    .{active.from}
                  </span>
                  <RefreshCw
                    className="h-5 w-5 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                  <span className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 font-mono text-lg font-bold uppercase tracking-wide text-emerald-700 shadow-sm dark:text-emerald-300 sm:text-xl">
                    .{active.to}
                  </span>
                </div>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Convert{" "}
                  <span className="font-medium text-foreground uppercase">
                    {active.from}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground uppercase">
                    {active.to}
                  </span>
                </p>

                <Button
                  className="mt-5 h-11 w-full rounded-full bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-600"
                  onClick={() => onSelectPair?.(active)}
                  disabled={!onSelectPair}
                >
                  Try this pair
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {previewPairs.length > 1 && (
                  <div
                    className="mt-4 flex items-center justify-center gap-1.5"
                    aria-hidden
                  >
                    {previewPairs.map((p, i) => (
                      <button
                        key={`${p.from}-${p.to}`}
                        type="button"
                        className={`h-1.5 rounded-full transition-all ${
                          i === index
                            ? "w-4 bg-emerald-500"
                            : "w-1.5 bg-border hover:bg-muted-foreground/40"
                        }`}
                        onClick={() => setIndex(i)}
                        aria-label={`Show ${p.from} to ${p.to}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
