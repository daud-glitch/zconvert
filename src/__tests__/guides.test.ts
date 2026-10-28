/**
 * Guide integrity.
 *
 * guides.ts claims both Google and readers a reason to trust the site, and its
 * docstring promises that every `related` pair is validated here — a typo'd
 * conversion would otherwise ship as a dead link from a page we are actively
 * asking search engines to index.
 */
import { describe, expect, it } from "vitest";
import { guides, getGuide, getGuideSlugs } from "@/lib/guides";
import { formats } from "@/lib/formats";
import { parseConversionSlug, pairToSlug } from "@/lib/conversion-pairs";

const exts = new Set(formats.map((f) => f.ext));

describe("guides", () => {
  it("has unique slugs and a working lookup", () => {
    const slugs = getGuideSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(getGuide(slug)?.slug).toBe(slug);
      // Slug shape matters: it is the URL segment.
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("keeps every meta description within search-result limits", () => {
    for (const g of guides) {
      expect(g.description.length, `${g.slug} description`).toBeGreaterThan(60);
      expect(g.description.length, `${g.slug} description`).toBeLessThanOrEqual(160);
    }
  });

  it("links only to conversion pairs the registry actually supports", () => {
    const broken: string[] = [];
    for (const g of guides) {
      for (const { from, to } of g.related) {
        const slug = pairToSlug(from, to);
        if (!parseConversionSlug(slug)) broken.push(`${g.slug}: ${slug}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("links only to formats that exist", () => {
    const missing: string[] = [];
    for (const g of guides) {
      for (const ext of g.relatedFormats) {
        if (!exts.has(ext)) missing.push(`${g.slug}: ${ext}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("is substantial enough to be worth indexing", () => {
    for (const g of guides) {
      // Everything a reader actually sees on the page: lead, block prose, lists
      // and FAQs. Headings count because they carry the argument's structure.
      const visible = [
        g.lead,
        ...g.blocks.flatMap((b) => [
          b.heading,
          ...b.paragraphs,
          ...(b.list ?? []).flatMap((i) => [i.term, i.text]),
        ]),
        ...g.faqs.flatMap((f) => [f.question, f.answer]),
      ];
      const words = visible.join(" ").split(/\s+/).filter(Boolean).length;
      expect(words, `${g.slug} word count`).toBeGreaterThan(450);
      expect(g.blocks.length, `${g.slug} blocks`).toBeGreaterThanOrEqual(3);
      expect(g.faqs.length, `${g.slug} faqs`).toBeGreaterThanOrEqual(2);
      expect(g.readingMinutes, `${g.slug} reading time`).toBeGreaterThan(0);
      // A guide with nothing to read is the exact thin-content problem these exist to fix.
      for (const block of g.blocks) {
        expect(block.paragraphs.filter((p) => p.trim()).length).toBeGreaterThan(0);
      }
    }
  });

  it("uses valid ISO dates and does not claim the future", () => {
    for (const g of guides) {
      expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(g.updated))).toBe(false);
    }
  });
});
