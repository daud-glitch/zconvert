import { getFormatByExt, type FormatCategory } from "@/lib/formats";

const CATEGORY_PATH: Record<FormatCategory, string> = {
  image: "/api/convert/image",
  data: "/api/convert/data",
  archive: "/api/convert/archive",
  document: "/api/convert/document",
  video: "/api/convert/other",
  audio: "/api/convert/other",
  ebook: "/api/convert/other",
  presentation: "/api/convert/other",
  subtitle: "/api/convert/other",
  font: "/api/convert/other",
  other: "/api/convert/other",
};

/** Oracle / self-hosted worker base, e.g. https://convert.example.com */
export function getConvertApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_CONVERT_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function usesRemoteConvertWorker(): boolean {
  return getConvertApiBaseUrl() !== null;
}

/** Full URL for browser fetch (Vercel UI → Oracle worker). */
export function getConvertApiPath(ext: string): string {
  const category = getFormatByExt(ext)?.category ?? "other";
  const path = CATEGORY_PATH[category] ?? CATEGORY_PATH.other;
  const base = getConvertApiBaseUrl();
  return base ? `${base}${path}` : path;
}
