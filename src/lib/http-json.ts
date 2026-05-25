/** Parse a fetch Response body as JSON; surface HTML/plain error pages clearly. */
export async function readJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`Empty response from server (${res.status})`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const hint = trimmed.startsWith("<")
      ? "Server returned an HTML error page (check terminal / API route logs)."
      : trimmed.slice(0, 120);
    throw new SyntaxError(
      `JSON.parse failed (${res.status} ${res.url}): ${hint}`,
    );
  }
}

/** Parse a JSON string stored in the database; never throw. */
export function parseStoredJsonArray(
  raw: string | null | undefined,
  fallback: string[] = [],
): string[] {
  if (!raw?.trim()) return fallback;
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? (value as string[]) : fallback;
  } catch {
    return fallback;
  }
}
