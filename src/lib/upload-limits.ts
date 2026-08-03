/** Vercel serverless request/response body hard limit (cannot be raised on any plan). */
export const VERCEL_FUNCTION_BODY_LIMIT_BYTES = Math.floor(4.5 * 1024 * 1024);

const MB = 1024 * 1024;

function parseMbEnv(name: string, fallbackMb: number): number {
  const n = parseInt(process.env[name] || String(fallbackMb), 10);
  return Number.isFinite(n) && n > 0 ? n : fallbackMb;
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

export function getServerMaxUploadBytes(): number {
  const configuredMb = parseMbEnv("MAX_UPLOAD_SIZE_MB", 100);
  const configured = configuredMb * MB;
  if (isVercelDeployment()) {
    return Math.min(configured, VERCEL_FUNCTION_BODY_LIMIT_BYTES);
  }
  return configured;
}

/** Client-visible cap (NEXT_PUBLIC_MAX_UPLOAD_MB; default 4 on Vercel via next.config). */
export function getClientMaxUploadBytes(): number {
  const defaultMb =
    process.env.NEXT_PUBLIC_VERCEL === "1" ||
    process.env.NEXT_PUBLIC_MAX_UPLOAD_MB === "4"
      ? 4
      : 100;
  const configuredMb = parseMbEnv("NEXT_PUBLIC_MAX_UPLOAD_MB", defaultMb);
  const configured = configuredMb * MB;
  if (hasRemoteConvertWorker()) {
    return configured;
  }
  if (process.env.NEXT_PUBLIC_VERCEL === "1") {
    return Math.min(configured, VERCEL_FUNCTION_BODY_LIMIT_BYTES);
  }
  return configured;
}

export function formatMaxUploadLabel(): string {
  const mb = Math.round(getClientMaxUploadBytes() / MB);
  return mb >= 1 ? `${mb}MB` : `${(getClientMaxUploadBytes() / 1024).toFixed(1)}KB`;
}

export function payloadTooLargeMessage(actualBytes: number): string {
  const maxMb = (getClientMaxUploadBytes() / MB).toFixed(1);
  const actualMb = (actualBytes / MB).toFixed(1);
  const cloud =
    isVercelDeployment() ||
    getClientMaxUploadBytes() <= VERCEL_FUNCTION_BODY_LIMIT_BYTES;
  if (cloud && !hasRemoteConvertWorker()) {
    return `File is ${actualMb} MB but the cloud converter accepts at most ${maxMb} MB per file (Vercel limit). Compress the file, split it, or configure an Oracle convert worker (see docs/ORACLE_VERCEL_SETUP.md).`;
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
  return "RAR output requires an external RAR CLI (WinRAR/rar). Set RAR_BIN to enable, or choose ZIP/TAR.GZ instead.";
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

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many conversions right now. Wait a minute and try again.";
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
