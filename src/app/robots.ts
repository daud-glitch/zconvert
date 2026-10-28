import type { MetadataRoute } from 'next';
import { CANONICAL_SITE_URL, resolveSiteUrl } from "@/lib/seo";

/**
 * robots.txt for Googlebot, Bingbot, and other crawlers.
 * Served at: https://www.convertek.tech/robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteUrl() || CANONICAL_SITE_URL;
  const disallow = [
    "/api/",
    "/core/",
    "/system/",
    "/admin",
    "/admin/",
    "/forgot-password",
    "/reset-password",
    // Internal converter deep-links — keep out of the index; SEO uses /x-to-y.
    "/*?*from=",
    "/*?*to=",
    // Non-HTML assets: crawled but never indexable, and they show up as
    // noise in Search Console's "crawled, not indexed" report.
    "/_next/static/",
    "/_next/image",
    "/manifest.webmanifest",
    "/sw.js",
    "/service-worker",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: "www.convertek.tech",
  };
}