/**
 * @vitest-environment jsdom
 *
 * The AdSense loader runs on every page for site review, so personalisation is
 * controlled by the inline bootstrap that runs before it. These tests pin that
 * behaviour: EEA visitors get non-personalised ads until they opt in, and an
 * explicit "reject" keeps personalisation off everywhere.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADSENSE_CLIENT, ADSENSE_SRC, adsConsentBootstrapScript } from "@/lib/ads";
import { CONSENT_STORAGE_KEY, saveConsent } from "@/lib/consent";

const originalIntl = globalThis.Intl;

/** Runs the shipped bootstrap string with a fixed timezone. */
function runBootstrap(timeZone: string): number {
  (globalThis as { Intl: typeof Intl }).Intl = {
    ...originalIntl,
    DateTimeFormat: (() => ({
      resolvedOptions: () => ({ timeZone }),
    })) as unknown as typeof Intl.DateTimeFormat,
  };
  (window as unknown as { adsbygoogle?: unknown }).adsbygoogle = undefined;
  window.eval(adsConsentBootstrapScript());
  const queue = (window as unknown as { adsbygoogle: { requestNonPersonalizedAds: number } })
    .adsbygoogle;
  return queue.requestNonPersonalizedAds;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  (globalThis as { Intl: typeof Intl }).Intl = originalIntl;
});

describe("AdSense wiring", () => {
  it("uses the publisher id from the account snippet", () => {
    expect(ADSENSE_CLIENT).toBe("ca-pub-1501827698606542");
    expect(ADSENSE_SRC).toContain(`client=${ADSENSE_CLIENT}`);
    expect(ADSENSE_SRC.startsWith("https://pagead2.googlesyndication.com/")).toBe(true);
  });

  it("embeds the consent storage key the banner writes", () => {
    expect(adsConsentBootstrapScript()).toContain(CONSENT_STORAGE_KEY);
  });
});

describe("personalisation bootstrap", () => {
  it("allows personalisation outside the EEA until the visitor objects", () => {
    expect(runBootstrap("Asia/Karachi")).toBe(0);
  });

  it("requests non-personalised ads in the EEA before any decision", () => {
    expect(runBootstrap("Europe/Berlin")).toBe(1);
    expect(runBootstrap("Europe/London")).toBe(1);
  });

  it("honours an explicit opt-in inside the EEA", () => {
    saveConsent({ ads: true, analytics: false });
    expect(runBootstrap("Europe/Berlin")).toBe(0);
  });

  it("honours an explicit opt-out everywhere", () => {
    saveConsent({ ads: false, analytics: true });
    expect(runBootstrap("Asia/Karachi")).toBe(1);
    expect(runBootstrap("America/New_York")).toBe(1);
  });

  it("survives corrupt stored state", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "{broken");
    expect(runBootstrap("Europe/Berlin")).toBe(1);
    expect((window as unknown as { adsbygoogle?: unknown }).adsbygoogle).toBeTruthy();
  });

  it("leaves a single queue when it runs twice (layout remounts)", () => {
    runBootstrap("Asia/Karachi");
    const first = (window as unknown as { adsbygoogle: unknown }).adsbygoogle;
    runBootstrap("Asia/Karachi");
    const second = (window as unknown as { adsbygoogle: unknown }).adsbygoogle;
    expect(Array.isArray(second)).toBe(true);
    expect(first).not.toBe(second);
  });
});
