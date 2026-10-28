/**
 * Guards the two AdSense/SEO quality problems found on the live site:
 *
 * 1. Every pair title was "… Online Free — Convertek" while the root layout
 *    appends "| Convertek", so ~2,500 titles ended with "— Convertek | Convertek".
 * 2. Every description was one sentence with the two format names swapped, so
 *    the whole index shared a single templated snippet.
 */
import { describe, expect, it } from "vitest";
import { getAllConversionPairSlugs, parseConversionSlug } from "@/lib/conversion-pairs";
import {
  SITE_NAME,
  conversionPairDescription,
  conversionPairTitle,
  stripBrandSuffix,
} from "@/lib/seo";

const pairs = getAllConversionPairSlugs().flatMap((slug) => {
  const parsed = parseConversionSlug(slug);
  return parsed ? [{ slug, from: parsed.from, to: parsed.to }] : [];
});

describe("conversion pair metadata", () => {
  it("has pairs to check", () => {
    expect(pairs.length).toBeGreaterThan(100);
  });

  it("keeps the brand out of the page title so the template adds it once", () => {
    const branded = pairs
      .map((p) => conversionPairTitle(p.from.ext, p.to.ext))
      .filter((title) => title.includes(SITE_NAME) || title.includes("|"));
    expect(branded).toEqual([]);
  });

  it("names both extensions in every title and description", () => {
    for (const p of pairs) {
      const title = conversionPairTitle(p.from.ext, p.to.ext);
      const description = conversionPairDescription(p.from, p.to);
      const from = p.from.ext.toUpperCase();
      const to = p.to.ext.toUpperCase();
      expect(title, p.slug).toContain(from);
      expect(title, p.slug).toContain(to);
      expect(description, p.slug).toContain(from);
      expect(description, p.slug).toContain(to);
    }
  });

  it("never renders the same description twice", () => {
    const owner = new Map<string, string>();
    const duplicates: string[] = [];
    for (const p of pairs) {
      const description = conversionPairDescription(p.from, p.to);
      const previous = owner.get(description);
      if (previous) duplicates.push(`${previous} == ${p.slug}`);
      else owner.set(description, p.slug);
    }
    expect(duplicates).toEqual([]);
  });

  it("stays within the search snippet length", () => {
    const tooLong = pairs
      .filter((p) => conversionPairDescription(p.from, p.to).length > 158)
      .map((p) => p.slug);
    expect(tooLong).toEqual([]);

    const tooShort = pairs
      .filter((p) => conversionPairDescription(p.from, p.to).length < 80)
      .map((p) => p.slug);
    expect(tooShort).toEqual([]);
  });
});

describe("stripBrandSuffix", () => {
  it("removes a brand an editor typed into a CMS SEO title", () => {
    expect(stripBrandSuffix("Convert PDF to JPG Online Free — Convertek")).toBe(
      "Convert PDF to JPG Online Free",
    );
    expect(stripBrandSuffix("Convert PDF to JPG | Convertek")).toBe("Convert PDF to JPG");
    expect(stripBrandSuffix("Convert PDF to JPG - Convertek")).toBe("Convert PDF to JPG");
    expect(stripBrandSuffix("Convert PDF to JPG | www.convertek.tech")).toBe(
      "Convert PDF to JPG",
    );
  });

  it("leaves an unbranded or awkward title alone", () => {
    expect(stripBrandSuffix("Terms of Service")).toBe("Terms of Service");
    expect(stripBrandSuffix("Convertek Privacy Policy")).toBe("Convertek Privacy Policy");
    // Never return an empty title, even if the whole string was the brand.
    expect(stripBrandSuffix("— Convertek")).toBe("— Convertek");
  });
});
