import type { MetadataRoute } from "next";
import { BRAND_TAGLINE, BRAND_TAGLINE_ACTION, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Free Online File Converter`,
    short_name: SITE_NAME,
    description: `${BRAND_TAGLINE} ${BRAND_TAGLINE_ACTION} Convert images, PDF, documents, audio, video and more — free, no watermarks.`,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    categories: ["utilities", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/favicon-64.png",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
