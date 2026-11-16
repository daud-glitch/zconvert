import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRightLeft, ChevronRight, HardDrive, Layers, Shield, Zap } from "lucide-react";
import { FileIllustration } from "@/components/common/FileIllustration";
import { formatNonVideoMaxUploadLabel, formatVideoMaxUploadLabel, getMaxNonVideoBatchFiles } from "@/lib/upload-limits";

const popularPairs = [
  { from: "heic", to: "jpg", type: "image" },
  { from: "pdf", to: "jpg", type: "pdf" },
  { from: "mov", to: "mp4", type: "video" },
  { from: "png", to: "webp", type: "image" },
  { from: "mp3", to: "wav", type: "audio" },
  { from: "xlsx", to: "csv", type: "data" },
] as const;

export function HomeConverterHero({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="converter-hero-heading"
      className="group grid min-w-0 items-center gap-5 rounded-3xl px-1 py-2 sm:gap-7 sm:bg-linear-to-br sm:from-emerald-50/70 sm:to-teal-50 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-10 lg:has-[[data-converter-queue]]:grid-cols-1 sm:dark:from-emerald-950/30 sm:dark:to-teal-950/30"
    >
      <div className="min-w-0">
        <h1 id="converter-hero-heading" className="text-3xl font-extrabold leading-[1.05] tracking-tight text-slate-950 sm:max-w-md sm:text-5xl xl:text-6xl group-has-[[data-converter-queue]]:text-3xl dark:text-white">
          Convert your files
        </h1>
        <p className="mt-3 text-sm text-slate-700 sm:text-lg group-has-[[data-converter-queue]]:hidden dark:text-slate-300">
          Images, PDFs, video, audio, and more.
        </p>
        <div aria-hidden="true" className="mt-6 flex items-end gap-1 sm:mt-9 sm:gap-2 group-has-[[data-converter-queue]]:hidden">
          <FileIllustration type="image" className="h-14 w-12 -rotate-3 sm:h-24 sm:w-20" />
          <FileIllustration type="pdf" className="z-10 h-16 w-13 sm:h-27 sm:w-22" />
          <FileIllustration type="video" className="h-14 w-12 rotate-3 sm:h-24 sm:w-20" />
        </div>
      </div>
      {children}
    </section>
  );
}

export function HomePopularConversions() {
  return (
    <section aria-labelledby="popular-pairs-heading" className="mt-8 sm:mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 sm:mb-5">
        <h2 id="popular-pairs-heading" className="text-xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
          Popular conversions
        </h2>
        <Link href="/conversions" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-300">
          Browse all formats <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {popularPairs.map(({ from, to, type }) => (
          <li key={`${from}-to-${to}`} className="min-w-0">
            <Link
              href={`/${from}-to-${to}`}
              className="group flex min-h-17 items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-bold text-slate-950 transition-colors hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:gap-4 sm:p-4 sm:text-base dark:text-white dark:hover:bg-emerald-950/30"
            >
              <FileIllustration type={type} />
              <span className="min-w-0 flex-1">{from.toUpperCase()} to {to.toUpperCase()}</span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}


export function HomeConverterFeatures() {
  const features = [
    { icon: Layers, title: "Mixed file batches", description: "Add images, documents, and audio to the same queue.", color: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
    { icon: ArrowRightLeft, title: "Per-file formats", description: "Choose a different output format for each file.", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
    { icon: Zap, title: "Server-side processing", description: "Convert files in the background and download each result when it is ready.", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
    { icon: Shield, title: "Temporary processing", description: "Files are processed temporarily. Download results from your browser.", color: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" },
    { icon: HardDrive, title: "Clear upload limits", description: `Up to ${formatNonVideoMaxUploadLabel()} per file, ${formatVideoMaxUploadLabel()} per video, and ${getMaxNonVideoBatchFiles()} non-video files per batch.`, color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  ];

  return (
    <section aria-labelledby="converter-features-heading" className="mt-10">
      <h2 id="converter-features-heading" className="mb-4 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">Why Convertek?</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {features.map(({ icon: Icon, title, description, color }) => (
          <li key={title} className="rounded-xl border border-border bg-card p-4">
            <span className={`mb-3 grid size-9 place-items-center rounded-lg ${color}`}>
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
