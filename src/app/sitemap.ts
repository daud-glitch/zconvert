import type { MetadataRoute } from "next";
import { formats } from "@/lib/formats";
import { CANONICAL_SITE_URL, resolveSiteUrl } from "@/lib/seo";
import { getConversionPairSlugs } from "@/lib/conversion-pairs";

/**
 * XML sitemap for Google Search Console & Bing Webmaster Tools.
 * Served at: https://www.convertek.tech/sitemap.xml
 *
 * Submit this URL in:
 * - Google: https://search.google.com/search-console
 * - Bing:   https://www.bing.com/webmasters
 *
 * Always emits www.convertek.tech — never legacy cloudconveter.tech,
 * even if NEXT_PUBLIC_SITE_URL is still set to the old domain on the host.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // resolve at request/build time (not module cache of a bad env at import)
  const base = resolveSiteUrl() || CANONICAL_SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/conversions`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // High-intent SEO pages: /conversions/{ext}
  const formatRoutes: MetadataRoute.Sitemap = formats.map((f) => ({
    url: `${base}/conversions/${encodeURIComponent(f.ext)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // Conversion pair landing pages: /{from}-to-{to}
  const pairRoutes: MetadataRoute.Sitemap = getConversionPairSlugs().map((slug) => ({
    url: `${base}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...pairRoutes, ...formatRoutes];
}
