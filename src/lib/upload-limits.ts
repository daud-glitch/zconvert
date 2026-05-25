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

/** Audio needs ffmpeg; available on Oracle worker or self-hosted. */
export function isAudioConversionAvailable(): boolean {
  if (hasRemoteConvertWorker()) return true;
  return !isVercelDeployment();
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
  const cloud = isVercelDeployment() || getClientMaxUploadBytes() <= VERCEL_FUNCTION_BODY_LIMIT_BYTES;
  if (cloud && !hasRemoteConvertWorker()) {
    return `File is ${actualMb} MB but the cloud converter accepts at most ${maxMb} MB per file (Vercel limit). Compress the file, split it, or configure an Oracle convert worker (see docs/ORACLE_VERCEL_SETUP.md).`;
  }
  return `File is ${actualMb} MB but the maximum allowed size is ${maxMb} MB.`;
}

export function audioUnavailableMessage(): string {
  return "Audio conversion is not available on the cloud deployment (requires ffmpeg and files under 4.5 MB). Use a self-hosted install for WAV/MP3 and other audio.";
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
