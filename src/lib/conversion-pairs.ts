import { formats } from "@/lib/formats";
import type { FormatInfo } from "@/lib/formats";

export interface ConversionPair {
  from: string;
  to: string;
}

export interface ResolvedPair {
  from: FormatInfo;
  to: FormatInfo;
}

/**
 * Top 50 conversion pairs ordered by estimated Google search volume.
 * Only pairs where `to` is in `from.targetFormats` are valid at runtime;
 * this list is pre-filtered to match actual backend capabilities.
 */
export const TOP_PAIRS: ConversionPair[] = [
  { from: "png", to: "jpg" },
  { from: "jpg", to: "png" },
  { from: "heic", to: "jpg" },
  { from: "webp", to: "jpg" },
  { from: "pdf", to: "jpg" },
  { from: "jpg", to: "pdf" },
  { from: "png", to: "pdf" },
  { from: "webp", to: "png" },
  { from: "heic", to: "png" },
  { from: "svg", to: "png" },
  { from: "png", to: "webp" },
  { from: "jpg", to: "webp" },
  { from: "pdf", to: "png" },
  { from: "bmp", to: "jpg" },
  { from: "tiff", to: "jpg" },
  { from: "avif", to: "jpg" },
  { from: "avif", to: "png" },
  { from: "ico", to: "png" },
  { from: "gif", to: "png" },
  { from: "jpeg", to: "png" },
  { from: "mp4", to: "mp3" },
  { from: "mov", to: "mp4" },
  { from: "avi", to: "mp4" },
  { from: "mkv", to: "mp4" },
  { from: "wav", to: "mp3" },
  { from: "flac", to: "mp3" },
  { from: "ogg", to: "mp3" },
  { from: "mp3", to: "wav" },
  { from: "aac", to: "mp3" },
  { from: "docx", to: "pdf" },
  { from: "pdf", to: "docx" },
  { from: "xlsx", to: "csv" },
  { from: "csv", to: "xlsx" },
  { from: "json", to: "csv" },
  { from: "csv", to: "json" },
  { from: "xml", to: "json" },
  { from: "json", to: "xml" },
  { from: "md", to: "pdf" },
  { from: "html", to: "pdf" },
  { from: "epub", to: "pdf" },
  { from: "pdf", to: "epub" },
  { from: "pptx", to: "pdf" },
  { from: "txt", to: "pdf" },
  { from: "docx", to: "html" },
  { from: "xlsx", to: "pdf" },
  { from: "yaml", to: "json" },
  { from: "json", to: "yaml" },
  { from: "srt", to: "vtt" },
  { from: "vtt", to: "srt" },
  { from: "zip", to: "tar" },
];

/** Convert a pair to its URL slug: `png-to-jpg` */
export function pairToSlug(from: string, to: string): string {
  return `${from}-to-${to}`;
}

/**
 * Parse a slug like `png-to-jpg` into resolved FormatInfo objects.
 * Returns null if the slug is not a valid conversion pair.
 */
export function parseConversionSlug(slug: string): ResolvedPair | null {
  const match = slug.match(/^([a-z0-9]+(?:\.[a-z0-9]+)?)-to-([a-z0-9]+(?:\.[a-z0-9]+)?)$/);
  if (!match) return null;

  const [, fromExt, toExt] = match;
  const fromFormat = formats.find((f) => f.ext === fromExt);
  const toFormat = formats.find((f) => f.ext === toExt);

  if (!fromFormat || !toFormat) return null;
  if (!fromFormat.targetFormats.includes(toExt)) return null;

  return { from: fromFormat, to: toFormat };
}

/**
 * Returns all valid conversion pair slugs (from TOP_PAIRS that resolve correctly).
 * Used for generateStaticParams and sitemap generation.
 */
export function getConversionPairSlugs(): string[] {
  return TOP_PAIRS.filter((p) => parseConversionSlug(pairToSlug(p.from, p.to)) !== null).map(
    (p) => pairToSlug(p.from, p.to),
  );
}

/**
 * Returns related pairs for a given from/to combination:
 * - other targets from the same source format
 * - other sources that convert to the same target
 * Capped at 8 results to keep UI concise.
 */
export function getRelatedPairs(fromExt: string, toExt: string): ConversionPair[] {
  const related: ConversionPair[] = [];
  const seen = new Set<string>();
  const addPair = (f: string, t: string) => {
    const key = `${f}-${t}`;
    if (key === `${fromExt}-${toExt}` || seen.has(key)) return;
    if (!parseConversionSlug(pairToSlug(f, t))) return;
    seen.add(key);
    related.push({ from: f, to: t });
  };

  const fromFormat = formats.find((f) => f.ext === fromExt);
  if (fromFormat) {
    for (const t of fromFormat.targetFormats.slice(0, 6)) {
      addPair(fromExt, t);
      if (related.length >= 8) break;
    }
  }
  for (const f of formats) {
    if (f.ext === fromExt) continue;
    if (f.targetFormats.includes(toExt)) {
      addPair(f.ext, toExt);
      if (related.length >= 8) break;
    }
  }

  return related.slice(0, 8);
}
