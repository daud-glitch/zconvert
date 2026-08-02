import {
  humanizeConversionError,
  normalizePayloadError,
} from "@/lib/upload-limits";

/** Turn fetch failures into a short user-facing message (handles Next.js HTML error pages). */
export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) {
    return humanizeConversionError(`${fallback} (${response.status})`);
  }
  try {
    const data = JSON.parse(trimmed) as { error?: string; message?: string };
    const msg = data.error || data.message || fallback;
    return humanizeConversionError(normalizePayloadError(msg));
  } catch {
    if (
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.includes("__next_error__") ||
      trimmed.startsWith("<html") ||
      response.status >= 500
    ) {
      return humanizeConversionError(
        "Server error during conversion. Please retry in a moment.",
      );
    }
    if (response.status === 413) {
      return humanizeConversionError(normalizePayloadError(trimmed));
    }
    return humanizeConversionError(trimmed.slice(0, 200));
  }
}
