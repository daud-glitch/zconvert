import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cloudconveter.tech";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/core/", "/system/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
