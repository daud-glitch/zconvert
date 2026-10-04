import { MetadataRoute } from 'next';
import { getAllConversionPairSlugs } from "@/lib/conversion-pairs";
import { formats } from "@/lib/formats";
import { CANONICAL_SITE_URL } from "@/lib/seo";

/**
 * Sitemap must only advertise URLs that are actually indexable.
 *
 * - Conversion pairs live at the site root (`/${slug}`) and self-canonical there.
 *   The old `/conversions/${slug}` form rendered "Format Not Found" + noindex,
 *   so listing it here told Google to index pages we told it to skip.
 * - Single-format pages (`/conversions/${ext}`) are a separate, valid route.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pairSlugs = getAllConversionPairSlugs();
  const lastModified = new Date();

  const pairFields: MetadataRoute.Sitemap = pairSlugs.map((slug) => ({
    url: `${CANONICAL_SITE_URL}/${slug}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const formatFields: MetadataRoute.Sitemap = formats.map((f) => ({
    url: `${CANONICAL_SITE_URL}/conversions/${f.ext}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    ...pairFields,
    ...formatFields,
    { url: `${CANONICAL_SITE_URL}/`, lastModified, changeFrequency: "daily", priority: 1.0 },
    { url: `${CANONICAL_SITE_URL}/conversions`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${CANONICAL_SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/donate`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${CANONICAL_SITE_URL}/changelog`, lastModified, changeFrequency: "weekly", priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${CANONICAL_SITE_URL}/terms`, lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}