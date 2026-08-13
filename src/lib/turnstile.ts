/**
 * Cloudflare Turnstile server verification.
 * Soft rollout: when TURNSTILE_SECRET_KEY is unset, checks are skipped (local/dev).
 * Production: set both TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */

const SITEVERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileRequired(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: unknown,
  ip?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: true };

  const response = typeof token === "string" ? token.trim() : "";
  if (!response) {
    return {
      ok: false,
      error: "Please complete the security check and try again.",
    };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", response);
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });

    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      "error-codes"?: string[];
    } | null;

    if (!data?.success) {
      return {
        ok: false,
        error: "Security check failed. Refresh and try again.",
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[turnstile] verify failed:", err);
    return {
      ok: false,
      error: "Security check unavailable. Try again in a moment.",
    };
  }
}
