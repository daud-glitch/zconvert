import { MetadataRoute } from 'next';
import { getIndexablePairSlugs } from "@/lib/conversion-pairs";
import { formats } from "@/lib/formats";
import { CANONICAL_SITE_URL } from "@/lib/seo";
import { getDisabledFormatExclusions } from "@/lib/format-catalog";
import { getGuideSlugs } from "@/lib/guides";

/**
 * Sitemap must only advertise URLs that are actually indexable.
 *
 * - Conversion pairs live at the site root (`/${slug}`) and self-canonical there.
 *   The old `/conversions/${slug}` form rendered "Format Not Found" + noindex,
 *   so listing it here told Google to index pages we told it to skip.
 * - Single-format pages (`/conversions/${ext}`) are a separate, valid route.
 * - Only the curated `getIndexablePairSlugs()` set is listed. The ~2,300-pair
 *   long tail renders `noindex, follow` (it is a templated duplicate of the
 *   same page), so advertising it here would recreate the sitemap/noindex
 *   mismatch this file exists to prevent.
 *
 * Formats an admin has disabled in the panel are excluded, so the panel becomes
 * a real source of truth for what we ask Google to index.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pairSlugs = getIndexablePairSlugs();
  const disabled = await getDisabledFormatExclusions();
  const lastModified = new Date();

  const pairFields: MetadataRoute.Sitemap = pairSlugs
    .filter((slug) => !disabled.has(slug))
    .map((slug) => ({
      url: `${CANONICAL_SITE_URL}/${slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  const formatFields: MetadataRoute.Sitemap = formats
    .filter((f) => !disabled.has(f.ext))
    .map((f) => ({
      url: `${CANONICAL_SITE_URL}/conversions/${f.ext}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  // Original editorial pages — the site's non-generated content.
  const guideFields: MetadataRoute.Sitemap = getGuideSlugs().map((slug) => ({
    url: `${CANONICAL_SITE_URL}/guides/${slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...pairFields,
    ...formatFields,
    { url: `${CANONICAL_SITE_URL}/`, lastModified, changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${CANONICAL_SITE_URL}/conversions`, lastModified, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${CANONICAL_SITE_URL}/guides`, lastModified, changeFrequency: "weekly" as const, priority: 0.7 },
    ...guideFields,
    { url: `${CANONICAL_SITE_URL}/about`, lastModified, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/donate`, lastModified, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${CANONICAL_SITE_URL}/changelog`, lastModified, changeFrequency: "weekly" as const, priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/contact`, lastModified, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/privacy`, lastModified, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${CANONICAL_SITE_URL}/terms`, lastModified, changeFrequency: "monthly" as const, priority: 0.3 },
  ];
}
