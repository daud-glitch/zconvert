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
 * Top high-traffic conversion pairs — single source for homepage, /conversions, and API fallback.
 * All remaining valid pairs are served on-demand (ISR).
 */
export const POPULAR_PAIRS_HOMEPAGE_COUNT = 15;
export const POPULAR_PAIRS_DIRECTORY_COUNT = 40;

export function getPopularPairs(
  limit = POPULAR_PAIRS_HOMEPAGE_COUNT,
): ConversionPair[] {
  return TOP_PAIRS.slice(0, limit);
}

export const TOP_PAIRS: ConversionPair[] = [
  // ── Images (most searched) ────────────────────────────────────────────────
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
  { from: "jpeg", to: "jpg" },
  { from: "png", to: "ico" },
  { from: "jpg", to: "ico" },
  { from: "jpg", to: "svg" },
  { from: "png", to: "svg" },
  { from: "webp", to: "pdf" },
  { from: "heic", to: "webp" },
  { from: "tiff", to: "png" },
  { from: "tiff", to: "pdf" },
  { from: "bmp", to: "png" },
  { from: "bmp", to: "pdf" },
  { from: "svg", to: "jpg" },
  { from: "svg", to: "pdf" },
  { from: "gif", to: "jpg" },
  { from: "gif", to: "webp" },
  { from: "png", to: "gif" },
  { from: "jpg", to: "gif" },
  { from: "heic", to: "pdf" },
  { from: "avif", to: "webp" },
  { from: "png", to: "bmp" },
  { from: "jpg", to: "bmp" },
  { from: "png", to: "tiff" },
  { from: "jpg", to: "tiff" },
  { from: "ico", to: "jpg" },
  { from: "webp", to: "gif" },
  { from: "webp", to: "svg" },
  { from: "bmp", to: "webp" },
  { from: "tiff", to: "webp" },
  { from: "gif", to: "pdf" },
  { from: "eps", to: "png" },
  // ── Audio / Video ─────────────────────────────────────────────────────────
  { from: "mp4", to: "mp3" },
  { from: "mov", to: "mp4" },
  { from: "avi", to: "mp4" },
  { from: "mkv", to: "mp4" },
  { from: "wav", to: "mp3" },
  { from: "flac", to: "mp3" },
  { from: "ogg", to: "mp3" },
  { from: "mp3", to: "wav" },
  { from: "aac", to: "mp3" },
  { from: "mp4", to: "gif" },
  { from: "mov", to: "mp3" },
  { from: "mkv", to: "mp3" },
  { from: "avi", to: "mp3" },
  { from: "mp4", to: "webm" },
  { from: "webm", to: "mp4" },
  { from: "mp4", to: "avi" },
  { from: "mp4", to: "mov" },
  { from: "mp4", to: "mkv" },
  { from: "flac", to: "wav" },
  { from: "wav", to: "flac" },
  { from: "ogg", to: "wav" },
  { from: "aac", to: "wav" },
  { from: "mp3", to: "ogg" },
  { from: "mp3", to: "aac" },
  { from: "mp3", to: "flac" },
  { from: "m4a", to: "mp3" },
  { from: "wma", to: "mp3" },
  { from: "mp4", to: "wav" },
  { from: "avi", to: "mkv" },
  { from: "mkv", to: "avi" },
  { from: "mov", to: "avi" },
  { from: "flv", to: "mp4" },
  { from: "wmv", to: "mp4" },
  { from: "3gp", to: "mp4" },
  { from: "ts", to: "mp4" },
  { from: "mpeg", to: "mp4" },
  { from: "mp4", to: "flv" },
  { from: "mp4", to: "wmv" },
  { from: "webm", to: "mp3" },
  { from: "ogv", to: "mp4" },
  { from: "m4v", to: "mp4" },
  { from: "mp4", to: "ts" },
  { from: "aac", to: "flac" },
  { from: "wav", to: "aac" },
  { from: "opus", to: "mp3" },
  { from: "mp3", to: "m4a" },
  { from: "flac", to: "aac" },
  { from: "wav", to: "ogg" },
  { from: "ogg", to: "flac" },
  { from: "aac", to: "ogg" },
  // ── Documents ─────────────────────────────────────────────────────────────
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
  { from: "pdf", to: "txt" },
  { from: "pdf", to: "html" },
  { from: "pdf", to: "md" },
  { from: "docx", to: "txt" },
  { from: "docx", to: "md" },
  { from: "txt", to: "docx" },
  { from: "md", to: "html" },
  { from: "html", to: "md" },
  { from: "html", to: "docx" },
  { from: "odt", to: "pdf" },
  { from: "odt", to: "docx" },
  { from: "docx", to: "odt" },
  { from: "rtf", to: "pdf" },
  { from: "rtf", to: "docx" },
  { from: "docx", to: "rtf" },
  { from: "csv", to: "pdf" },
  { from: "xlsx", to: "json" },
  { from: "json", to: "xlsx" },
  { from: "xml", to: "csv" },
  { from: "csv", to: "xml" },
  { from: "yaml", to: "csv" },
  { from: "csv", to: "yaml" },
  { from: "toml", to: "json" },
  { from: "json", to: "toml" },
  { from: "epub", to: "docx" },
  { from: "epub", to: "txt" },
  { from: "epub", to: "html" },
  { from: "epub", to: "md" },
  { from: "mobi", to: "epub" },
  { from: "txt", to: "html" },
  { from: "txt", to: "md" },
  { from: "pdf", to: "rtf" },
  { from: "pptx", to: "txt" },
  { from: "xlsx", to: "html" },
  { from: "xlsx", to: "xml" },
  { from: "xlsx", to: "tsv" },
  { from: "csv", to: "tsv" },
  { from: "tsv", to: "csv" },
  { from: "json", to: "tsv" },
  { from: "xml", to: "xlsx" },
  { from: "json", to: "html" },
  { from: "yaml", to: "xml" },
  { from: "xml", to: "yaml" },
  { from: "md", to: "docx" },
  { from: "md", to: "txt" },
  { from: "rst", to: "pdf" },
  { from: "rst", to: "html" },
  { from: "rst", to: "docx" },
  { from: "tex", to: "pdf" },
  { from: "tex", to: "html" },
  { from: "tex", to: "docx" },
  { from: "adoc", to: "pdf" },
  { from: "adoc", to: "html" },
  { from: "adoc", to: "docx" },
  { from: "ipynb", to: "pdf" },
  { from: "ipynb", to: "html" },
  { from: "ipynb", to: "md" },
  { from: "org", to: "pdf" },
  { from: "org", to: "html" },
  { from: "pptx", to: "html" },
  { from: "pptx", to: "png" },
  { from: "pptx", to: "jpg" },
  { from: "odp", to: "pdf" },
  { from: "odp", to: "pptx" },
  { from: "pptx", to: "odp" },
  // ── Archives ──────────────────────────────────────────────────────────────
  { from: "zip", to: "7z" },
  { from: "7z", to: "zip" },
  { from: "rar", to: "zip" },
  { from: "tar", to: "zip" },
  { from: "tar", to: "7z" },
  { from: "zip", to: "tar.gz" },
  { from: "tar.gz", to: "zip" },
  // ── Subtitles ─────────────────────────────────────────────────────────────
  { from: "srt", to: "ass" },
  { from: "ass", to: "srt" },
  { from: "vtt", to: "ass" },
  { from: "sbv", to: "srt" },
  { from: "srt", to: "sbv" },
  // ── Data ──────────────────────────────────────────────────────────────────
  { from: "parquet", to: "csv" },
  { from: "parquet", to: "json" },
  { from: "csv", to: "parquet" },
  { from: "json", to: "parquet" },
  { from: "geojson", to: "json" },
  { from: "json", to: "geojson" },
  { from: "env", to: "json" },
  { from: "ini", to: "json" },
  { from: "json", to: "ini" },
  { from: "xlsx", to: "ods" },
  { from: "ods", to: "xlsx" },
  { from: "ods", to: "csv" },
  { from: "csv", to: "ods" },
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
 * Returns TOP_PAIRS slugs validated against the formats registry.
 * Used for generateStaticParams — these pages are pre-built at deploy time.
 */
export function getConversionPairSlugs(): string[] {
  return TOP_PAIRS.filter((p) => parseConversionSlug(pairToSlug(p.from, p.to)) !== null).map(
    (p) => pairToSlug(p.from, p.to),
  );
}

/**
 * Returns ALL valid conversion pair slugs derived from the formats registry.
 * Used for sitemap generation — covers every from→to pair the backend supports.
 */
export function getAllConversionPairSlugs(): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const f of formats) {
    for (const t of f.targetFormats) {
      const slug = pairToSlug(f.ext, t);
      if (!seen.has(slug)) {
        seen.add(slug);
        slugs.push(slug);
      }
    }
  }
  return slugs;
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
