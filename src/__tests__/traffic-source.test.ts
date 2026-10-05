import { describe, expect, it } from "vitest";
import { resolveTrafficSource, sanitizePath } from "@/lib/traffic-source";
import {
  TRAFFIC_RANGES,
  parseTrafficRange,
  trafficRangeDays,
  trafficRangeLabel,
  trafficRangePhrase,
  trafficSince,
} from "@/lib/traffic-range";

describe("resolveTrafficSource", () => {
  it("marks empty referrer as Direct", () => {
    expect(resolveTrafficSource({})).toBe("Direct");
    expect(resolveTrafficSource({ referrer: "" })).toBe("Direct");
  });

  it("uses utm_source over referrer", () => {
    expect(
      resolveTrafficSource({
        referrer: "https://google.com/",
        utmSource: "newsletter",
        utmMedium: "email",
      }),
    ).toBe("newsletter / email");
  });

  it("maps known search and social hosts", () => {
    expect(
      resolveTrafficSource({ referrer: "https://www.google.com/search?q=x" }),
    ).toBe("Google");
    expect(
      resolveTrafficSource({ referrer: "https://www.facebook.com/" }),
    ).toBe("Facebook");
    expect(resolveTrafficSource({ referrer: "https://t.co/abc" })).toBe(
      "X / Twitter",
    );
  });

  it("returns bare hostname for other referrers", () => {
    expect(
      resolveTrafficSource({ referrer: "https://blog.example.com/post" }),
    ).toBe("blog.example.com");
  });
});

describe("sanitizePath", () => {
  it("normalizes paths", () => {
    expect(sanitizePath("/formats?x=1")).toBe("/formats?x=1");
    expect(sanitizePath("relative")).toBe("/");
    expect(sanitizePath(null)).toBe("/");
  });
});

describe("traffic range", () => {
  it("offers 1 day, 7 days, 30 days and all time", () => {
    expect(TRAFFIC_RANGES.map(trafficRangeDays)).toEqual([1, 7, 30, null]);
  });

  it("defaults to 30 days for missing or unknown values", () => {
    expect(parseTrafficRange(null)).toBe("30d");
    expect(parseTrafficRange("")).toBe("30d");
    expect(parseTrafficRange("99y")).toBe("30d");
    expect(parseTrafficRange("7d")).toBe("7d");
  });

  it("turns a range into a lower bound, or none for all time", () => {
    const now = Date.UTC(2026, 0, 31);
    expect(trafficSince("1d", now)?.toISOString()).toBe(
      "2026-01-30T00:00:00.000Z",
    );
    expect(trafficSince("30d", now)?.toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(trafficSince("all", now)).toBeNull();
  });

  it("labels the buttons and the summary badge", () => {
    expect(TRAFFIC_RANGES.map(trafficRangeLabel)).toEqual([
      "1d",
      "7d",
      "30d",
      "All time",
    ]);
    expect(trafficRangePhrase("1d")).toBe("Last 1 day");
    expect(trafficRangePhrase("7d")).toBe("Last 7 days");
    expect(trafficRangePhrase("all")).toBe("All time");
  });
});
