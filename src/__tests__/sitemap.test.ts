/**
 * Sitemap integrity — guards the class of bug where the sitemap advertises
 * URLs that render noindex, 404, or a canonical pointing somewhere else.
 *
 * That exact mismatch shipped 2,358 noindex pages to Google before this test
 * existed: sitemap.ts emitted `/conversions/<a>-to-<b>` while the route only
 * understood bare format extensions.
 */
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  getAllConversionPairSlugs,
  getIndexablePairSlugs,
  isIndexablePair,
  parseConversionSlug,
  pairToSlug,
} from "@/lib/conversion-pairs";
import { formats } from "@/lib/formats";
import { CANONICAL_SITE_URL } from "@/lib/seo";

const entries = await sitemap();
const urls = entries.map((e) => e.url);

describe("sitemap", () => {
  it("emits only absolute https URLs on the canonical host", () => {
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith(`${CANONICAL_SITE_URL}/`)).toBe(true);
    }
  });

  it("has no duplicate URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not list pair pages under /conversions/ (they noindex there)", () => {
    const bad = urls.filter((u) =>
      /\/conversions\/[a-z0-9.]+-to-[a-z0-9.]+$/.test(u),
    );
    expect(bad).toEqual([]);
  });

  it("lists every indexable pair at its canonical root URL", () => {
    const pairUrls = new Set(
      urls.filter((u) => u.startsWith(`${CANONICAL_SITE_URL}/`)).map((u) =>
        u.slice(CANONICAL_SITE_URL.length + 1),
      ),
    );
    const missing = getIndexablePairSlugs().filter(
      (slug) => !pairUrls.has(slug),
    );
    expect(missing).toEqual([]);
  });

  /**
   * The curated split: ~2,300 pairs exist, but only the traffic-curated set is
   * offered for indexing. Listing the rest would contradict the `noindex`
   * those pages render, which is exactly the mismatch this file guards.
   */
  it("keeps the long tail out of the sitemap", () => {
    const listed = new Set(getIndexablePairSlugs());
    const leaked = getAllConversionPairSlugs().filter(
      (slug) => !isIndexablePair(slug) && urls.includes(`${CANONICAL_SITE_URL}/${slug}`),
    );
    expect(leaked).toEqual([]);
    // If these were equal the curation would be a no-op and the test vacuous.
    expect(listed.size).toBeGreaterThan(100);
    expect(getAllConversionPairSlugs().length).toBeGreaterThan(listed.size);
  });



  it("lists only single-format pages under /conversions/", () => {
    const listed = urls
      .filter((u) => u.startsWith(`${CANONICAL_SITE_URL}/conversions/`))
      .map((u) => u.slice(`${CANONICAL_SITE_URL}/conversions/`.length));
    for (const ext of listed) {
      expect(formats.some((f) => f.ext === ext)).toBe(true);
    }
  });

  it("never lists a URL whose slug would 404", () => {
    const bogus = urls.filter((u) => {
      const path = u.slice(CANONICAL_SITE_URL.length + 1);
      if (path.includes("/")) return false; // only check bare pair slugs
      return path.includes("-to-") && !parseConversionSlug(path);
    });
    expect(bogus).toEqual([]);
  });

  it("gives the homepage top priority", () => {
    const home = entries.find((e) => e.url === `${CANONICAL_SITE_URL}/`);
    expect(home?.priority).toBe(1.0);
  });
});

describe("pair page robots", () => {
  /**
   * The sitemap only advertises indexable pairs, so the page itself must render
   * `index` for those and `noindex, follow` for the rest. This reads the real
   * generateMetadata() rather than the helper, so the two cannot drift.
   */
  it("indexes curated pairs and noindexes the long tail", async () => {
    const { generateMetadata } = await import("@/app/[slug]/page");
    const robotsOf = (meta: { robots?: unknown }) =>
      meta.robots as { index?: boolean; follow?: boolean } | undefined;

    const core = getIndexablePairSlugs()[0];
    expect(core, "expected at least one curated pair").toBeTruthy();
    expect(robotsOf(await generateMetadata({ params: Promise.resolve({ slug: core }) }))?.index).toBe(
      true,
    );

    const tail = getAllConversionPairSlugs().find((s) => !isIndexablePair(s));
    expect(tail, "expected a long-tail pair to exist").toBeTruthy();
    const tailRobots = robotsOf(
      await generateMetadata({ params: Promise.resolve({ slug: tail! }) }),
    );
    expect(tailRobots?.index).toBe(false);
    // Still followed: the long tail is how Google keeps discovering format pages.
    expect(tailRobots?.follow).toBe(true);
  });
});

describe("pair slug round-trip", () => {
  it("pairToSlug output resolves back through parseConversionSlug", () => {
    for (const f of formats.slice(0, 40)) {
      for (const t of f.targetFormats.slice(0, 5)) {
        const slug = pairToSlug(f.ext, t);
        expect(parseConversionSlug(slug)).not.toBeNull();
      }
    }
  });

  it("rejects junk paths that appeared in Search Console (404 report)", () => {
    // http://www.convertek.tech/$ and /& were crawled and 404'd.
    for (const junk of ["$", "&", "%24", "%26"]) {
      expect(parseConversionSlug(junk)).toBeNull();
    }
  });
});