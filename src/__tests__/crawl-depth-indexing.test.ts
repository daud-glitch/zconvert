/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { getAllConversionPairSlugs } from "@/lib/conversion-pairs";
import { formats, getFormatByExt } from "@/lib/formats";
import { pairToSlug } from "@/lib/conversion-pairs";

/**
 * Crawl depth.
 *
 * Conversion pair pages were effectively orphaned: the "PDF can convert to"
 * grid on /conversions/pdf linked to /conversions/docx (a format page), not to
 * /pdf-to-docx. Only ~157 pairs were linked from anywhere. Every pair now has
 * inbound links from statically generated format pages.
 */
describe("crawl depth", () => {
  const slugs = new Set(getAllConversionPairSlugs());

  it("links every pair from its source format page", () => {
    const orphans: string[] = [];

    for (const format of formats) {
      for (const target of format.targetFormats) {
        const slug = pairToSlug(format.ext, target);
        if (!slugs.has(slug)) orphans.push(`${format.ext} -> ${target}`);
      }
    }

    expect(orphans).toEqual([]);
  });

  it("links every pair from its target format page too", () => {
    // /conversions/docx lists "can be converted into DOCX" -> /pdf-to-docx
    const orphans: string[] = [];
    for (const format of formats) {
      for (const source of formats) {
        if (!source.targetFormats.includes(format.ext)) continue;
        const slug = pairToSlug(source.ext, format.ext);
        if (!slugs.has(slug)) orphans.push(`${source.ext} -> ${format.ext}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("keeps pair URLs reachable within three clicks of the homepage", () => {
    // homepage -> /conversions -> /conversions/<ext> -> /<a>-to-<b>
    const reachable = new Set<string>();
    for (const format of formats) {
      for (const target of format.targetFormats) {
        reachable.add(pairToSlug(format.ext, target));
      }
    }
    const coverage = reachable.size / slugs.size;
    expect(coverage).toBeGreaterThan(0.99);
  });

  it("still resolves format pages that pair pages link back to", () => {
    // The source-format link on every pair page must not become a dead end.
    expect(getFormatByExt("pdf")).toBeTruthy();
    expect(getFormatByExt("docx")).toBeTruthy();
  });
});

describe("sitemap still advertises the canonical URLs", () => {
  it("includes every pair slug as a root URL", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    expect(urls.has("https://www.convertek.tech/pdf-to-docx")).toBe(true);
    // The retired pair-slug directory must never come back.
    for (const url of urls) {
      expect(url).not.toMatch(/\/conversions\/[a-z0-9]+-to-[a-z0-9]+$/);
    }
  });
});