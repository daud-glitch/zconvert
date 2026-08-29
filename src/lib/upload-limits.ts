/** Vercel serverless request/response body hard limit (cannot be raised on any plan). */
export const VERCEL_FUNCTION_BODY_LIMIT_BYTES = Math.floor(4.5 * 1024 * 1024);

const MB = 1024 * 1024;

/** Absolute max (video) on self-hosted; body parser / chunk assembly use this. */
export const DEFAULT_VIDEO_MAX_UPLOAD_MB = 100;
/** Images, docs, audio, data, archives, etc. */
export const DEFAULT_NONVIDEO_MAX_UPLOAD_MB = 30;
/** Max non-video files active in the conversion queue at once. */
export const DEFAULT_MAX_NONVIDEO_BATCH_FILES = 10;

function parseMbEnv(name: string, fallbackMb: number): number {
  const n = parseInt(process.env[name] || String(fallbackMb), 10);
  return Number.isFinite(n) && n > 0 ? n : fallbackMb;
}

function parseCountEnv(name: string, fallback: number): number {
  const n = parseInt(process.env[name] || String(fallback), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function maybeCapVercelClient(bytes: number): number {
  if (hasRemoteConvertWorker()) return bytes;
  if (process.env.NEXT_PUBLIC_VERCEL === "1") {
    return Math.min(bytes, VERCEL_FUNCTION_BODY_LIMIT_BYTES);
  }
  return bytes;
}

export function isVercelDeployment(): boolean {
  return Boolean(process.env.VERCEL);
}

function hasRemoteConvertWorker(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVERT_API_URL?.trim());
}

/**
 * ffmpeg audio/video: enabled on self-hosted servers by default.
 * Disabled on Vercel unless FORCE_FFMPEG=1 or a remote convert worker is set.
 */
export function isFfmpegConversionAvailable(): boolean {
  if (process.env.DISABLE_FFMPEG === "1" || process.env.DISABLE_FFMPEG === "true") {
    return false;
  }
  if (
    process.env.FORCE_FFMPEG === "1" ||
    process.env.FORCE_FFMPEG === "true"
  ) {
    return true;
  }
  if (hasRemoteConvertWorker()) return true;
  return !isVercelDeployment();
}

/** @deprecated Prefer isFfmpegConversionAvailable */
export function isAudioConversionAvailable(): boolean {
  return isFfmpegConversionAvailable();
}

export function isVideoConversionAvailable(): boolean {
  return isFfmpegConversionAvailable();
}

/**
 * Hard ceiling for request body / staging (must fit largest allowed class = video).
 * Env: MAX_UPLOAD_SIZE_MB or MAX_VIDEO_UPLOAD_MB (default 100).
 */
export function getServerMaxUploadBytes(): number {
  const configuredMb = parseMbEnv(
    "MAX_UPLOAD_SIZE_MB",
    parseMbEnv("MAX_VIDEO_UPLOAD_MB", DEFAULT_VIDEO_MAX_UPLOAD_MB),
  );
  const configured = configuredMb * MB;
  if (isVercelDeployment()) {
    return Math.min(configured, VERCEL_FUNCTION_BODY_LIMIT_BYTES);
  }
  return configured;
}

/** Video only — default 100 MB. */
export function getVideoMaxUploadBytes(): number {
  const serverCeiling = getServerMaxUploadBytes();
  if (isVercelDeployment() && !hasRemoteConvertWorker()) {
    return serverCeiling;
  }
  const clientMb = parseMbEnv(
    "NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB",
    parseMbEnv(
      "NEXT_PUBLIC_MAX_UPLOAD_MB",
      parseMbEnv("MAX_VIDEO_UPLOAD_MB", DEFAULT_VIDEO_MAX_UPLOAD_MB),
    ),
  );
  return maybeCapVercelClient(Math.min(clientMb * MB, serverCeiling));
}

/** Non-video files — default 30 MB. */
export function getNonVideoMaxUploadBytes(): number {
  const ceiling = getVideoMaxUploadBytes();
  if (isVercelDeployment() && !hasRemoteConvertWorker()) {
    return Math.min(ceiling, getServerMaxUploadBytes());
  }
  const configuredMb = parseMbEnv(
    "NEXT_PUBLIC_MAX_NONVIDEO_UPLOAD_MB",
    parseMbEnv("MAX_NONVIDEO_UPLOAD_MB", DEFAULT_NONVIDEO_MAX_UPLOAD_MB),
  );
  return maybeCapVercelClient(Math.min(configuredMb * MB, ceiling));
}

/**
 * Max bytes for a source category (`video` vs everything else).
 * Fallback: absolute client/server ceiling for unknown categories.
 */
export function getMaxUploadBytesForCategory(
  category: string | null | undefined,
): number {
  if ((category || "").toLowerCase() === "video") {
    return getVideoMaxUploadBytes();
  }
  return getNonVideoMaxUploadBytes();
}

/** Common video extensions — used server-side without pulling React helpers. */
const VIDEO_SOURCE_EXTS = new Set([
  "mp4",
  "webm",
  "avi",
  "mkv",
  "mov",
  "wmv",
  "flv",
  "m4v",
  "mpeg",
  "mpg",
  "3gp",
  "ogv",
  "ts",
]);

export function isVideoSourceExt(ext: string | null | undefined): boolean {
  return VIDEO_SOURCE_EXTS.has((ext || "").toLowerCase().replace(/^\./, ""));
}

export function getMaxUploadBytesForExt(ext: string | null | undefined): number {
  return isVideoSourceExt(ext)
    ? getVideoMaxUploadBytes()
    : getNonVideoMaxUploadBytes();
}

/** Absolute client ceiling (largest class = video). Prefer per-category getters. */
export function getClientMaxUploadBytes(): number {
  return getVideoMaxUploadBytes();
}

/** How many non-video files may sit in the active queue (default 10). */
export function getMaxNonVideoBatchFiles(): number {
  return parseCountEnv(
    "NEXT_PUBLIC_MAX_NONVIDEO_BATCH",
    parseCountEnv("MAX_NONVIDEO_BATCH", DEFAULT_MAX_NONVIDEO_BATCH_FILES),
  );
}

export function formatMaxUploadLabel(): string {
  const nonMb = Math.round(getNonVideoMaxUploadBytes() / MB);
  const vidMb = Math.round(getVideoMaxUploadBytes() / MB);
  if (nonMb === vidMb) {
    return nonMb >= 1
      ? `${nonMb}MB`
      : `${(getNonVideoMaxUploadBytes() / 1024).toFixed(1)}KB`;
  }
  return `${nonMb}MB · ${vidMb}MB video`;
}

export function formatNonVideoMaxUploadLabel(): string {
  const mb = Math.round(getNonVideoMaxUploadBytes() / MB);
  return mb >= 1
    ? `${mb}MB`
    : `${(getNonVideoMaxUploadBytes() / 1024).toFixed(1)}KB`;
}

export function formatVideoMaxUploadLabel(): string {
  const mb = Math.round(getVideoMaxUploadBytes() / MB);
  return mb >= 1
    ? `${mb}MB`
    : `${(getVideoMaxUploadBytes() / 1024).toFixed(1)}KB`;
}

export function payloadTooLargeMessage(
  actualBytes: number,
  opts?: { kind?: "video" | "file" },
): string {
  const maxBytes =
    opts?.kind === "video"
      ? getVideoMaxUploadBytes()
      : opts?.kind === "file"
        ? getNonVideoMaxUploadBytes()
        : getClientMaxUploadBytes();
  const maxMb = (maxBytes / MB).toFixed(1);
  const actualMb = (actualBytes / MB).toFixed(1);
  const cloud =
    isVercelDeployment() || maxBytes <= VERCEL_FUNCTION_BODY_LIMIT_BYTES;
  if (cloud && !hasRemoteConvertWorker()) {
    return `File is ${actualMb} MB but the cloud converter accepts at most ${maxMb} MB per file (Vercel limit). Compress the file, split it, or configure an Oracle convert worker (see docs/ORACLE_VERCEL_SETUP.md).`;
  }
  if (opts?.kind === "video") {
    return `Video is ${actualMb} MB but the maximum allowed size is ${maxMb} MB.`;
  }
  if (opts?.kind === "file") {
    return `File is ${actualMb} MB but non-video files are limited to ${maxMb} MB (video up to ${formatVideoMaxUploadLabel()}).`;
  }
  return `File is ${actualMb} MB but the maximum allowed size is ${maxMb} MB.`;
}

export function audioUnavailableMessage(): string {
  return "Audio conversion requires ffmpeg. On Vercel it is disabled unless you set FORCE_FFMPEG=1 or NEXT_PUBLIC_CONVERT_API_URL to a media worker. On Heroku, redeploy so heroku-postbuild can install vendor/ffmpeg (or set FFMPEG_BIN).";
}

export function videoUnavailableMessage(): string {
  return "Video conversion requires ffmpeg. On Vercel it is disabled unless you set FORCE_FFMPEG=1 or NEXT_PUBLIC_CONVERT_API_URL to a media worker. On Heroku, redeploy so heroku-postbuild can install vendor/ffmpeg (or set FFMPEG_BIN).";
}

export function libreOfficeUnavailableMessage(): string {
  return "This conversion requires LibreOffice. Install LibreOffice and set SOFFICE_BIN (or EXTERNAL_TOOLCHAIN_ENABLED=1 with soffice on PATH).";
}

export function calibreUnavailableMessage(): string {
  return "This ebook conversion requires Calibre. Install Calibre and set CALIBRE_EBOOK_CONVERT_BIN (or put ebook-convert on PATH with EXTERNAL_TOOLCHAIN_ENABLED=1).";
}

export function rarUnavailableMessage(): string {
  return "RAR packaging is not available on this server. Choose ZIP, 7Z, or TAR.GZ instead — or set RAR_BIN to a WinRAR/rar CLI path.";
}

export function zstdUnavailableMessage(): string {
  return "Zstandard (tar.zst) compression is not available on this Node runtime. Choose ZIP, TAR.GZ, or TAR.BZ2 instead.";
}

export function normalizePayloadError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("function_payload") ||
    lower.includes("payload too large") ||
    lower.includes("request entry too large") ||
    lower.includes("entity too large") ||
    lower.includes("body exceeded")
  ) {
    return payloadTooLargeMessage(VERCEL_FUNCTION_BODY_LIMIT_BYTES + 1);
  }
  return message;
}

/** Short, user-facing conversion errors (UI + toasts). Never expose stacks. */
export function humanizeConversionError(message: string): string {
  const msg = normalizePayloadError(String(message || "Conversion failed"));
  const lower = msg.toLowerCase();

  // Never leak raw traces / node internals
  if (
    lower.includes("at object.") ||
    lower.includes("    at ") ||
    lower.includes("node_modules") ||
    lower.includes("errnoexception") ||
    lower.includes("stack:") ||
    /^error:\s*$/i.test(msg.trim())
  ) {
    return "Conversion failed. Try again with a smaller file or a different format.";
  }

  if (
    lower.includes("internal server error") ||
    lower.includes("internal error") ||
    lower === "error" ||
    lower.includes("econnreset") ||
    lower.includes("socket hang up") ||
    lower.includes("network error")
  ) {
    return "The server disconnected during conversion. Retry once — large video may need lower quality or audio-only extract.";
  }

  if (
    lower.includes("unsupported compression codec") ||
    lower.includes("failed to read parquet")
  ) {
    return "Could not read this Parquet file. Re-export it (CSV/JSON) or try again — GZIP/ZSTD/Brotli files are supported when the file is valid.";
  }

  if (
    lower.includes("failed to read sav") ||
    lower.includes("sav file contains no") ||
    lower.includes("not a valid .sav") ||
    lower.includes("not an spss system file") ||
    lower.includes("bad magic")
  ) {
    if (
      lower.includes("zip archive") ||
      lower.includes("microsoft office") ||
      lower.includes("plain text/csv") ||
      lower.includes("spss portable")
    ) {
      const cleaned = msg
        .replace(/^Failed to read SAV file:\s*/i, "")
        .replace(/\.\s*The file may be corrupt.*$/i, "")
        .replace(/[A-Za-z]:\\[^\s]+/g, "")
        .replace(/\/app\/[^\s]+/g, "")
        .trim();
      return cleaned.length > 220 ? `${cleaned.slice(0, 217)}…` : cleaned;
    }
    return "This file is not a valid SPSS statistics (.sav) dataset. The .sav extension is also used by game saves and other apps — open it in SPSS or export as CSV from your stats software, then try again.";
  }

  if (
    lower.includes("could not convert azw") ||
    lower.includes("could not convert mobi") ||
    (lower.includes("ebook conversion requires calibre") &&
      (lower.includes("azw") || lower.includes("mobi")))
  ) {
    return "Could not convert this Kindle ebook. The file may be DRM-protected or corrupt. Try removing DRM first, or install Calibre on the server for best results.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many conversions right now. Wait a minute and try again.";
  }
  if (
    lower.includes("upload session not found") ||
    lower.includes("session not found or expired") ||
    lower.includes("upload session expired") ||
    (lower.includes("sticky") && lower.includes("dyno"))
  ) {
    return "Upload session expired or could not be found. Re-add the file and convert again (keep the same tab open on slow networks).";
  }
  if (
    lower.includes("job not found") ||
    lower.includes("job expired") ||
    lower.includes("conversion job expired")
  ) {
    return "Conversion job expired. Try Convert again — keep this tab open for long video encodes.";
  }
  if (
    lower.includes("busy converting") ||
    lower.includes("in line") ||
    lower.includes("queue") ||
    lower.includes("about #")
  ) {
    return msg.length > 180 ? msg.slice(0, 180) : msg;
  }
  if (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("deadline") ||
    lower.includes("h12") ||
    lower.includes("service unavailable")
  ) {
    return "Conversion took too long and was stopped. For long video try a shorter clip, lower quality, or convert to audio only.";
  }

  // Archive errors first — never mislabel as audio
  if (
    lower.includes("rar_bin") ||
    lower.includes("winrar") ||
    lower.includes("unrar") ||
    lower.includes("unrar_bin") ||
    (lower.includes("rar") &&
      (lower.includes("external rar") ||
        lower.includes("packaging is not available") ||
        lower.includes("choose zip") ||
        lower.includes("could not extract rar") ||
        lower.includes("install unrar")))
  ) {
    if (lower.includes("packaging") || lower.includes("rar_bin")) {
      return rarUnavailableMessage();
    }
    return "Could not open this RAR file. It may be password-protected or corrupt — or UnRAR/WinRAR is missing on the server. Try ZIP instead, or set UNRAR_BIN.";
  }
  if (
    lower.includes("failed to extract") ||
    lower.includes("could not extract") ||
    lower.includes("corrupt archive") ||
    lower.includes("invalid archive") ||
    lower.includes("empty archive") ||
    lower.includes("7z packing failed") ||
    (lower.includes("archive") &&
      (lower.includes("not supported") ||
        lower.includes("not implemented") ||
        lower.includes("unsupported")))
  ) {
    const cleaned = msg
      .replace(/[A-Za-z]:\\[^\s]+/g, "")
      .replace(/\/app\/[^\s]+/g, "")
      .trim();
    return cleaned.length > 180 ? `${cleaned.slice(0, 177)}…` : cleaned;
  }

  if (
    lower.includes("ffmpeg") &&
    (lower.includes("not found") ||
      lower.includes("not runnable") ||
      lower.includes("exit 127") ||
      lower.includes("could not run") ||
      lower.includes("spawn"))
  ) {
    return "Audio/video engine is unavailable on this server. Try again later.";
  }

  // Audio only when clearly media/ffmpeg-related (do NOT match bare "conversion failed")
  const looksLikeFfmpegMedia =
    lower.includes("ffmpeg") ||
    lower.includes("audio conversion to") ||
    lower.includes("libvorbis") ||
    lower.includes("libopus") ||
    lower.includes("libmp3lame") ||
    lower.includes("does not contain any stream") ||
    lower.includes("unknown encoder") ||
    lower.includes("error while opening encoder") ||
    (lower.includes("size=") &&
      (lower.includes("0kib") || lower.includes("0kb")) &&
      lower.includes("n/a"));

  if (
    looksLikeFfmpegMedia &&
    (lower.includes("exited with code") ||
      lower.includes("conversion failed") ||
      lower.includes("empty output") ||
      lower.includes("does not contain any stream") ||
      lower.includes("unknown encoder") ||
      lower.includes("error while opening encoder") ||
      lower.includes("audio conversion to") ||
      (lower.includes("size=") && lower.includes("n/a")))
  ) {
    return "Audio conversion failed. Retry or try another format (WAV/MP3). The file may be incomplete or use an unsupported codec.";
  }
  if (
    lower.includes("invalid data found") ||
    lower.includes("error opening input") ||
    lower.includes("could not read this") ||
    (lower.includes("ffmpeg") && lower.includes("corrupt"))
  ) {
    return "This media file could not be read (corrupt, incomplete upload, or unsupported encoding). Re-select the file and try again.";
  }
  if (
    lower.includes("upload incomplete") ||
    lower.includes("chunk") ||
    lower.includes("upload session")
  ) {
    return msg.length > 200 ? `${msg.slice(0, 197)}…` : msg;
  }
  if (
    lower.includes("unexpected end of form") ||
    lower.includes("multipart") ||
    lower.includes("failed to read uploaded")
  ) {
    return "Upload failed. Refresh the page and try again.";
  }
  if (lower.includes("empty upload") || lower.includes("empty file")) {
    return "The uploaded file was empty. Choose another file.";
  }
  if (lower.includes("not supported") || lower.includes("unsupported")) {
    return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
  }
  if (lower.includes("exceeds maximum") || lower.includes("too large")) {
    return msg;
  }
  if (
    lower.includes("server error") ||
    lower.includes("crashed") ||
    lower.includes("misconfiguration")
  ) {
    return "Server error during conversion. Please retry in a moment.";
  }
  if (lower.includes("enomem") || lower.includes("out of memory") || lower.includes("killed")) {
    return "The server ran out of memory on this file. Try a smaller video or convert to audio only.";
  }
  if (lower.includes("signal") && lower.includes("sig")) {
    return "Conversion was interrupted. Try again with lower quality or a shorter clip.";
  }

  // Strip accidental path prefixes
  const cleaned = msg.replace(/[A-Za-z]:\\[^\s]+/g, "").replace(/\/app\/[^\s]+/g, "").trim();
  const out = cleaned || "Conversion failed. Please try again.";
  return out.length > 180 ? `${out.slice(0, 177)}…` : out;
}
