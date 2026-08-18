/** Brand prefix for converted downloads (server + client safe). */
export const DOWNLOAD_BRAND_PREFIX = "convertek.tech";

const _sanitize = (s: string) =>
  s.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");

export function brandedDownloadFilename(
  baseName: string,
  ext: string,
): string {
  const cleanExt = (ext || "bin").replace(/^\./, "").toLowerCase();
  const base = _sanitize(baseName.replace(/\.[^/.]+$/, "")).slice(0, 120) || "file";
  const raw = `${base}.${cleanExt}`;
  const lower = raw.toLowerCase();
  if (
    lower.startsWith(DOWNLOAD_BRAND_PREFIX.toLowerCase()) ||
    lower.includes("convertek.tech") ||
    lower.includes("cloudconverter.tech") ||
    lower.includes("cloudconveter.tech")
  ) {
    return raw;
  }
  return `${DOWNLOAD_BRAND_PREFIX}-${raw}`;
}

/** Build a branded ZIP filename: convertek.tech-{name}.zip */
export function bulkZipDownloadFilename(fileNames: string[]): string {
  const firstBase = _sanitize((fileNames[0] || "files").replace(/\.[^/.]+$/, "")).slice(0, 80) || "files";
  if (fileNames.length <= 1) {
    return `${DOWNLOAD_BRAND_PREFIX}-${firstBase}.zip`;
  }
  return `${DOWNLOAD_BRAND_PREFIX}-${firstBase}-and-${fileNames.length - 1}-more.zip`;
}