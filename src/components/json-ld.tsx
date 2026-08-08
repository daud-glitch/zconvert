import {
  BRAND_TAGLINE,
  DEFAULT_DESCRIPTION,
  SITE_EMAIL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

/** Site-wide JSON-LD graph (Organization + WebSite + WebApplication + FAQ). */
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
          width: 512,
          height: 512,
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
        screenshot: `${SITE_URL}/og-image.png`,
        softwareVersion: "1.0",
        inLanguage: "en-US",
        isAccessibleForFree: true,
        keywords:
          "file converter, image converter, PDF converter, free online converter, batch convert, Convertek",
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Is Convertek free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Convertek is free to use with fair upload limits (typically 30 MB per non-video file and 100 MB for video). Converted files have no watermarks.",
            },
          },
          {
            "@type": "Question",
            name: "Can I convert mixed file types in one batch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Drop different types (for example PNG, PDF, and MP3) into one queue and choose a separate output format for each file.",
            },
          },
          {
            "@type": "Question",
            name: "Do you keep my uploaded files?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Files are processed temporarily on the server. Converted downloads stay in your browser storage. We do not keep a permanent personal cloud library of your files.",
            },
          },
          {
            "@type": "Question",
            name: "What formats does Convertek support?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Convertek supports 100+ formats across images, documents, data, audio, video, archives, fonts, subtitles, presentations, and ebooks. Browse the full list at /conversions.",
            },
          },
        ],
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
