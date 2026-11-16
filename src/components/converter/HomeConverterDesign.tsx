import Link from "next/link";
import { ArrowRightLeft, ChevronRight, HardDrive, Layers, Shield, Zap } from "lucide-react";
import { FileIconTile } from "@/components/common/FileIconTile";
import { formatNonVideoMaxUploadLabel, formatVideoMaxUploadLabel, getMaxNonVideoBatchFiles } from "@/lib/upload-limits";

const popularPairs = [
  { from: "heic", to: "jpg", type: "image" },
  { from: "pdf", to: "jpg", type: "pdf" },
  { from: "mov", to: "mp4", type: "video" },
  { from: "png", to: "webp", type: "image" },
  { from: "mp3", to: "wav", type: "audio" },
  { from: "xlsx", to: "csv", type: "data" },
] as const;

export function HomePopularConversions() {
  return (
    <section aria-labelledby="popular-pairs-heading" className="mt-9 w-full sm:mt-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:mb-5">
        <h2 id="popular-pairs-heading" className="text-xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
          Popular conversions
        </h2>
        <Link href="/conversions" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
          Browse all formats <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {popularPairs.map(({ from, to, type }) => (
          <li key={`${from}-to-${to}`} className="min-w-0">
            <Link
              href={`/${from}-to-${to}`}
              className="group flex min-h-18 items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-bold text-slate-950 shadow-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:min-h-21 sm:gap-3.5 sm:px-4 sm:text-base dark:text-white dark:hover:bg-emerald-950/25"
            >
              <FileIconTile type={type} extension={from} />
              <span className="min-w-0 flex-1">{from.toUpperCase()} to {to.toUpperCase()}</span>
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground group-hover:border-emerald-200 group-hover:text-emerald-800 dark:group-hover:border-emerald-800 dark:group-hover:text-emerald-300">
                <ChevronRight className="size-4" />
              </span>
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
    <section aria-labelledby="converter-features-heading" className="mt-10 w-full">
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
