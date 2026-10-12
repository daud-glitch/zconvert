/**
 * Pure helpers behind the converter UI.
 *
 * Extracted from ConverterView so the branching rules (merge inputs, preview
 * eligibility, target resolution, zip entry naming) can be unit-tested without
 * mounting the component.
 */
import { type FileItem } from "@/lib/app-types";
import { getFormatByExt } from "@/lib/formats";
import { getMaxNonVideoBatchFiles, getVideoMaxUploadBytes } from "@/lib/upload-limits";

export const MAX_NONVIDEO_BATCH = getMaxNonVideoBatchFiles();
export const MAX_VIDEO_BYTES = getVideoMaxUploadBytes();
export const MEDIA_CONVERSION_ENABLED =
  process.env.NEXT_PUBLIC_MEDIA_ENABLED !== "0" &&
  process.env.NEXT_PUBLIC_AUDIO_ENABLED !== "0";
export const VIDEO_CONVERSION_ENABLED =
  process.env.NEXT_PUBLIC_VIDEO_ENABLED !== "0" &&
  process.env.NEXT_PUBLIC_MEDIA_ENABLED !== "0";
export const AUDIO_CONVERSION_ENABLED =
  MEDIA_CONVERSION_ENABLED ||
  Boolean(process.env.NEXT_PUBLIC_CONVERT_API_URL?.trim());

export function getMergeSourceBlob(item: FileItem): Blob | null {
  if (item.outputPackage === "zip" || item.targetFormat !== "pdf") return null;
  if (item.status === "done" && item.result) return item.result;
  if (item.ext === "pdf") return item.file;
  return null;
}

export function mergeOutputFileName(item: FileItem): string {
  const baseName = item.name.replace(/\.[^/.]+$/, "");
  if (item.ext === "pdf" && item.targetFormat === "pdf") {
    return item.name.toLowerCase().endsWith(".pdf") ? item.name : `${baseName}.pdf`;
  }
  return `${baseName}.${item.targetFormat}`;
}

/** API map first; fall back to built-in catalog so cold loads still accept files. */
export function targetsForExt(
  ext: string,
  map: Record<string, string[]>,
): string[] {
  const fromMap = map[ext];
  if (fromMap && fromMap.length > 0) return fromMap;
  return getFormatByExt(ext)?.targetFormats ?? [];
}

/** Human size change: avoid crazy % like ↑13428% on WAV/uncompressed output. */
export function formatSizeChangeLabel(input: number, output: number): string {
  if (input <= 0) return "—";
  if (output < input) return `↓${Math.round((1 - output / input) * 100)}%`;
  if (output === input) return "same";
  const ratio = output / input;
  if (ratio >= 2) {
    return `↑${ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}×`;
  }
  return `↑${Math.round((ratio - 1) * 100)}%`;
}

export function canPreviewResult(item: FileItem): boolean {
  if (!item.result || item.outputPackage === "zip") return false;
  const t = (item.targetFormat || "").toLowerCase();
  return [
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "bmp",
    "svg",
    "pdf",
    "avif",
    "ico",
  ].includes(t);
}

export function uniqueZipEntryName(
  used: Set<string>,
  preferred: string,
): string {
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  const dot = preferred.lastIndexOf(".");
  const base = dot > 0 ? preferred.slice(0, dot) : preferred;
  const ext = dot > 0 ? preferred.slice(dot) : "";
  let n = 2;
  while (used.has(`${base}-${n}${ext}`)) n += 1;
  const name = `${base}-${n}${ext}`;
  used.add(name);
  return name;
}

/**
 * True when the queue holds work that a reload or close would destroy: files
 * still waiting to convert (including those staging) or mid-conversion. Done and
 * failed rows are already settled, so they never warrant a warning.
 */
export function hasUnfinishedWork(items: FileItem[]): boolean {
  return items.some((f) => f.status === "pending" || f.status === "converting");
}

export function normalizeExtParam(value: string | null): string {
  return (value || "").toLowerCase().replace(/^\./, "");
}

export function acceptForPreferredFrom(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return ".jpg,.jpeg,.jpe";
  return `.${ext}`;
}

export function resolveDefaultTargetFormat(
  ext: string,
  targets: string[],
  preferredFrom: string | null,
  preferredTo: string | null,
): string {
  if (
    preferredTo &&
    targets.includes(preferredTo) &&
    (!preferredFrom || ext === preferredFrom)
  ) {
    return preferredTo;
  }
  if (ext === "pdf" && targets.includes("pdf")) return "pdf";
  return targets.find((t) => t !== ext) || targets[0] || "";
}

export function syncPreferredPairUrl(
  from: string | null,
  to: string | null,
): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (from) url.searchParams.set("from", from);
  else url.searchParams.delete("from");
  if (to) url.searchParams.set("to", to);
  else url.searchParams.delete("to");
  const next = `${url.pathname}${url.search}`;
  window.history.replaceState({}, "", next);
}