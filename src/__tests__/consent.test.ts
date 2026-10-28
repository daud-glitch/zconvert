/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_OPEN_EVENT,
  clearConsent,
  hasAdsConsent,
  hasAnalyticsConsent,
  isEeaTimeZone,
  needsConsentPrompt,
  openCookieSettings,
  readConsent,
  saveConsent,
  subscribeConsent,
} from "@/lib/consent";

beforeEach(() => {
  window.localStorage.clear();
});

describe("EEA timezone detection", () => {
  it("treats European timezones as EEA/UK/CH", () => {
    for (const tz of ["Europe/Berlin", "Europe/London", "Europe/Zurich", "Europe/Dublin"]) {
      expect(isEeaTimeZone(tz)).toBe(true);
    }
  });

  it("includes the non-Europe EEA zones", () => {
    for (const tz of ["Atlantic/Canary", "Atlantic/Reykjavik", "Asia/Nicosia"]) {
      expect(isEeaTimeZone(tz)).toBe(true);
    }
  });

  it("leaves the rest of the world alone", () => {
    for (const tz of ["Asia/Karachi", "America/New_York", "Africa/Lagos", null, undefined, ""]) {
      expect(isEeaTimeZone(tz)).toBe(false);
    }
  });
});

describe("consent defaults", () => {
  it("allows optional storage outside the EEA until the visitor objects", () => {
    expect(hasAdsConsent("Asia/Karachi")).toBe(true);
    expect(hasAnalyticsConsent("Asia/Karachi")).toBe(true);
    expect(needsConsentPrompt("Asia/Karachi")).toBe(false);
  });

  it("denies optional storage inside the EEA until the visitor agrees", () => {
    expect(hasAdsConsent("Europe/Berlin")).toBe(false);
    expect(hasAnalyticsConsent("Europe/Berlin")).toBe(false);
    expect(needsConsentPrompt("Europe/Berlin")).toBe(true);
  });
});

describe("stored decisions", () => {
  it("round-trips a decision and makes an explicit choice win over the region default", () => {
    saveConsent({ ads: false, analytics: true });

    const stored = readConsent();
    expect(stored?.ads).toBe(false);
    expect(stored?.analytics).toBe(true);
    expect(stored?.version).toBe(1);

    // Outside the EEA the default is "allowed", but the decision overrides it.
    expect(hasAdsConsent("Asia/Karachi")).toBe(false);
    expect(hasAnalyticsConsent("Asia/Karachi")).toBe(true);
    // And inside the EEA an opt-in still holds.
    expect(hasAdsConsent("Europe/Berlin")).toBe(false);
    expect(hasAnalyticsConsent("Europe/Berlin")).toBe(true);
    expect(needsConsentPrompt("Europe/Berlin")).toBe(false);
  });

  it("ignores corrupt storage instead of throwing", () => {
    window.localStorage.setItem("convertek:consent:v1", "{not json");
    expect(readConsent()).toBeNull();
    expect(hasAdsConsent("Asia/Karachi")).toBe(true);
  });

  it("ignores a decision written by an older schema", () => {
    window.localStorage.setItem(
      "convertek:consent:v1",
      JSON.stringify({ ads: true, analytics: true }),
    );
    expect(readConsent()).toBeNull();
  });

  it("clearConsent re-enables the prompt", () => {
    saveConsent({ ads: true, analytics: true });
    clearConsent();
    expect(readConsent()).toBeNull();
    expect(needsConsentPrompt("Europe/Berlin")).toBe(true);
  });
});

describe("listeners", () => {
  it("notifies subscribers on save and on an open request", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeConsent(onChange);
    const onOpen = vi.fn();
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);

    saveConsent({ ads: true, analytics: false });
    expect(onChange).toHaveBeenCalledTimes(1);

    openCookieSettings();
    expect(onOpen).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
  });
});
