import { describe, expect, it } from "vitest";
import { resolveTrafficSource, sanitizePath } from "@/lib/traffic-source";

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
