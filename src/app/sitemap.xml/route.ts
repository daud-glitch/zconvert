import { getServerSideSitemap } from "next-sitemap";
import { getAllConversionPairs } from "@/lib/conversion-pairs";
import { CANONICAL_SITE_URL } from "@/lib/seo";

export async function GET() {
  const conversionPairs = await getAllConversionPairs();

  const sitemapFields = conversionPairs.map((pair) => ({
    loc: `${CANONICAL_SITE_URL}/conversions/${pair.from}-${pair.to}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 0.7,
  }));

  // Add static pages
  sitemapFields.push(
    {
      loc: `${CANONICAL_SITE_URL}/`,
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${CANONICAL_SITE_URL}/about`,
      lastmod: new Date().toISOString(),
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      loc: `${CANONICAL_SITE_URL}/contact`,
      lastmod: new Date().toISOString(),
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      loc: `${CANONICAL_SITE_URL}/privacy`,
      lastmod: new Date().toISOString(),
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      loc: `${CANONICAL_SITE_URL}/terms`,
      lastmod: new Date().toISOString(),
      changefreq: "monthly",
      priority: 0.5,
    },
  );

  return getServerSideSitemap(sitemapFields);
}
