/**
 * Cloudflare Turnstile server verification.
 * Soft rollout: when TURNSTILE_SECRET_KEY is unset, checks are skipped (local/dev).
 * Production: set both TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */

import { isTurnstileBypassed } from "@/lib/turnstile-config";

const SITEVERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileRequired(): boolean {
  if (isTurnstileBypassed()) return false;
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: unknown,
  _ip?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isTurnstileBypassed()) return { ok: true };

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!secret) return { ok: true };

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (siteKey && secret === siteKey) {
    console.error(
      "[turnstile] TURNSTILE_SECRET_KEY matches the site key — set the Secret Key from the Cloudflare Turnstile dashboard (not the Site Key).",
    );
  }

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
    // Omit remoteip: wrong/proxy IPs cause false rejects behind Heroku/CDNs.

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
      console.error(
        "[turnstile] siteverify failed:",
        data?.["error-codes"] ?? "unknown",
      );
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
