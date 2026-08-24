import { MetadataRoute } from 'next';
import { getAllConversionPairSlugs } from "@/lib/conversion-pairs";
import { CANONICAL_SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = getAllConversionPairSlugs();
  const lastModified = new Date();

  const sitemapFields: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${CANONICAL_SITE_URL}/conversions/${slug}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  sitemapFields.push(
    { url: `${CANONICAL_SITE_URL}/`, lastModified, changeFrequency: "daily", priority: 1.0 },
    { url: `${CANONICAL_SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/changelog`, lastModified, changeFrequency: "weekly", priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${CANONICAL_SITE_URL}/terms`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  );

  return sitemapFields;
}
