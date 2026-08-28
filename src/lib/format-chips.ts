import { getCategoryFromExt } from "@/lib/app-helpers";

const extChipStyles: Record<string, string> = {
  png: "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  jpg: "border-lime-400/40 bg-lime-500/15 text-lime-700 dark:text-lime-300",
  jpeg: "border-lime-400/40 bg-lime-500/15 text-lime-700 dark:text-lime-300",
  webp: "border-teal-400/40 bg-teal-500/15 text-teal-700 dark:text-teal-300",
  avif: "border-cyan-400/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  heic: "border-green-400/40 bg-green-500/15 text-green-700 dark:text-green-300",
  svg: "border-indigo-400/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  gif: "border-pink-400/40 bg-pink-500/15 text-pink-700 dark:text-pink-300",
  bmp: "border-stone-400/40 bg-stone-500/15 text-stone-700 dark:text-stone-300",
  tiff: "border-zinc-400/40 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  ico: "border-slate-400/40 bg-slate-500/15 text-slate-700 dark:text-slate-300",
  pdf: "border-rose-400/45 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  docx: "border-sky-400/45 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  doc: "border-sky-400/45 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  md: "border-indigo-400/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  csv: "border-orange-400/45 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  json: "border-amber-400/45 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  xlsx: "border-emerald-400/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  mp3: "border-violet-400/45 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  wav: "border-pink-400/40 bg-pink-500/15 text-pink-700 dark:text-pink-300",
  mp4: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  mov: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  zip: "border-yellow-400/45 bg-yellow-500/15 text-yellow-800 dark:text-yellow-300",
  sav: "border-blue-400/45 bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

const categoryFallback: Record<string, string> = {
  image: "border-emerald-400/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  video: "border-fuchsia-400/40 bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300",
  audio: "border-violet-400/40 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  document: "border-sky-400/45 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  data: "border-orange-400/45 bg-orange-500/12 text-orange-700 dark:text-orange-300",
  archive: "border-yellow-400/45 bg-yellow-500/12 text-yellow-800 dark:text-yellow-300",
  ebook: "border-teal-400/40 bg-teal-500/12 text-teal-700 dark:text-teal-300",
  presentation: "border-amber-400/45 bg-amber-500/12 text-amber-800 dark:text-amber-300",
  subtitle: "border-cyan-400/40 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  font: "border-pink-400/40 bg-pink-500/12 text-pink-700 dark:text-pink-300",
  other: "border-border/60 bg-muted/60 text-muted-foreground",
};

export function getFormatChipClass(ext: string): string {
  const key = ext.toLowerCase().replace(/^\./, "");
  if (extChipStyles[key]) return extChipStyles[key];
  const cat = getCategoryFromExt(key) || "other";
  return categoryFallback[cat] ?? categoryFallback.other;
}
