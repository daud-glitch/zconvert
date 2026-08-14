/**
 * Kill switch for Cloudflare Turnstile.
 * Also skippable via TURNSTILE_DISABLED=1 / NEXT_PUBLIC_TURNSTILE_DISABLED=1.
 */
export const TURNSTILE_TEMPORARILY_DISABLED = false;

export function isTurnstileBypassed(): boolean {
  if (TURNSTILE_TEMPORARILY_DISABLED) return true;
  const flag =
    process.env.TURNSTILE_DISABLED ?? process.env.NEXT_PUBLIC_TURNSTILE_DISABLED;
  return flag === "1" || flag === "true";
}
