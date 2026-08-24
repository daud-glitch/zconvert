import type { MetadataRoute } from "next";
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
