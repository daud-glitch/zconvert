import {
  BRAND_TAGLINE,
  BRAND_TAGLINE_ACTION,
  DEFAULT_DESCRIPTION,
  OG_IMAGE_ABS,
  SITE_EMAIL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

/**
 * Site-wide JSON-LD (Organization + WebSite + WebApplication).
 * FAQPage lives only on the homepage — see HomeFaqJsonLd — so schema matches visible content.
 */
export default function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        email: SITE_EMAIL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo-mark.png`,
          width: 384,
          height: 384,
        },
        sameAs: [],
        contactPoint: {
          "@type": "ContactPoint",
          email: SITE_EMAIL,
          contactType: "customer support",
          url: `${SITE_URL}/contact`,
          availableLanguage: "English",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        alternateName: ["Convertek File Converter", "Convertek Online Converter"],
        description: DEFAULT_DESCRIPTION,
        url: SITE_URL,
        applicationCategory: "UtilityApplication",
        applicationSubCategory: "File Converter",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        featureList: [
          BRAND_TAGLINE,
          BRAND_TAGLINE_ACTION,
          "Mixed-type batch conversion with per-file output formats",
          "Images: PNG, JPG, WebP, AVIF, GIF, and more",
          "Documents & PDF conversion",
          "Data formats (JSON, CSV, YAML, and more)",
          "Audio & video conversion where available",
          "Archives, fonts, subtitles, presentations, ebooks",
          "Local conversion history in the browser",
          "No watermarks on converted files",
          "Temporary server processing — no permanent file library",
        ],
        screenshot: OG_IMAGE_ABS,
        softwareVersion: "1.0",
        inLanguage: "en-US",
        isAccessibleForFree: true,
        keywords:
          "file converter, image converter, PDF converter, free online converter, batch convert, Convertek",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
