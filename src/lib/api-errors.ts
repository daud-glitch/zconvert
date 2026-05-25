import { normalizePayloadError } from "@/lib/upload-limits";

/** Turn fetch failures into a short user-facing message (handles Next.js HTML error pages). */
export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) {
    return `${fallback} (${response.status})`;
  }
  try {
    const data = JSON.parse(trimmed) as { error?: string; message?: string };
    const msg = data.error || data.message || fallback;
    return normalizePayloadError(msg);
  } catch {
    if (
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.includes("__next_error__") ||
      trimmed.startsWith("<html")
    ) {
      return `Server error (${response.status}). The conversion API crashed — check Vercel deployment logs (Functions → /api/convert).`;
    }
    if (response.status === 413) {
      return normalizePayloadError(trimmed);
    }
    return normalizePayloadError(trimmed.slice(0, 200));
  }
}
