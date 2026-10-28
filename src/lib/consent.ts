/**
 * Cookie / advertising consent state.
 *
 * The site itself serves first-party, cookieless analytics, but Google AdSense
 * stores cookies — so EEA, UK and Swiss visitors get an explicit choice before
 * any of that runs. Visitors elsewhere are treated as opted in until they say
 * otherwise; the footer's "Cookie settings" link lets anyone change or withdraw
 * the choice at any time.
 *
 * Everything here is browser-only and defensive: storage can throw (Safari
 * private mode, blocked site data), and ad code must never run on a thrown
 * consent read.
 */

export const CONSENT_STORAGE_KEY = "convertek:consent:v1";
/** Dispatch to re-open the banner (footer "Cookie settings"). */
export const CONSENT_OPEN_EVENT = "convertek:open-cookie-settings";
/** Fired whenever the stored decision changes. */
export const CONSENT_CHANGE_EVENT = "convertek:consent-changed";

export interface ConsentDecision {
  version: 1;
  /** First-party page-view counting. */
  analytics: boolean;
  /** Third-party advertising cookies (Google AdSense). */
  ads: boolean;
  /** ISO timestamp of when the visitor decided. */
  decidedAt: string;
}

/**
 * EEA + UK + Switzerland timezones that are not under `Europe/`.
 *
 * Timezone is a heuristic, not geolocation: the server host gives us no
 * country header, and showing the notice to someone who did not need it is
 * harmless, while missing a EU visitor is a compliance problem.
 *
 * Exported as an array because the ad bootstrap script in `lib/ads.ts` embeds
 * it inline, where a Set cannot be serialised. Keep both in sync there.
 */
export const EXTRA_EEA_TIMEZONES = [
  "Atlantic/Canary",
  "Atlantic/Madeira",
  "Atlantic/Azores",
  "Atlantic/Faroe",
  "Atlantic/Reykjavik",
  "Asia/Nicosia",
  "Asia/Famagusta",
  "Africa/Ceuta",
  "America/Godthab",
  "America/Nuuk",
] as const;

/** True for timezones used in the EEA, the UK or Switzerland. */
export function isEeaTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone) return false;
  if ((EXTRA_EEA_TIMEZONES as readonly string[]).includes(timeZone)) return true;
  // Europe/* covers the EU, UK, Iceland, Norway, Liechtenstein and Switzerland.
  // It also catches Moscow/Istanbul, which is fine: over-prompting is safe.
  return timeZone.startsWith("Europe/");
}

function visitorTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** True when the current visitor's timezone maps to the EEA, UK or Switzerland. */
export function isEeaVisitor(timeZone: string | null | undefined = visitorTimeZone()): boolean {
  return isEeaTimeZone(timeZone);
}

export function readConsent(): ConsentDecision | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentDecision> | null;
    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.ads !== "boolean" ||
      typeof parsed.analytics !== "boolean"
    ) {
      return null;
    }
    return {
      version: 1,
      ads: parsed.ads,
      analytics: parsed.analytics,
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : "",
    };
  } catch {
    return null;
  }
}

/** Persists a decision and notifies listeners. Returns what was stored. */
export function saveConsent(choice: {
  ads: boolean;
  analytics: boolean;
}): ConsentDecision {
  const decision: ConsentDecision = {
    version: 1,
    ads: choice.ads,
    analytics: choice.analytics,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(decision));
  } catch {
    /* storage blocked — the in-memory event still unblocks this page view */
  }
  notifyConsentChange();
  return decision;
}

/** Forgets the decision so the banner asks again. */
export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notifyConsentChange();
}

/**
 * Consent for third-party ad cookies.
 *
 * No decision yet: allowed outside the EEA/UK/CH (opt-out model), denied inside
 * it (opt-in model). An explicit decision always wins.
 */
export function hasAdsConsent(timeZone?: string | null): boolean {
  const decision = readConsent();
  if (decision) return decision.ads;
  return !isEeaVisitor(timeZone);
}

export function hasAnalyticsConsent(timeZone?: string | null): boolean {
  const decision = readConsent();
  if (decision) return decision.analytics;
  return !isEeaVisitor(timeZone);
}

/** The banner should open on its own only where consent must be opt-in. */
export function needsConsentPrompt(timeZone?: string | null): boolean {
  if (readConsent()) return false;
  return isEeaVisitor(timeZone);
}

function notifyConsentChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Opens the consent banner from anywhere on the page. */
export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

/** Subscribes to consent changes (same tab and other tabs). Returns an unsubscribe. */
export function subscribeConsent(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(CONSENT_CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
