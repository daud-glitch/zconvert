const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.convertek.tech";

export default function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Convertek",
    description:
      "Online file converter for images, documents, data, audio, video, and more. Temporary processing; converted results stay in your browser. Fair file size limits, no watermarks.",
    url: SITE,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "Convertek",
      url: SITE,
      email: "support@convertek.tech",
    },
    featureList: [
      "Mixed-type batch conversion: different file types in one queue, each with its own target format",
      "Image conversion (PNG, JPG, WebP, AVIF, and more)",
      "Document and data conversion",
      "Audio and video conversion where ffmpeg is available",
      "Batch conversion (up to 10 files · 1 video)",
      "Local conversion history in the browser",
      "No watermarks",
      "Temporary server processing",
    ],
    screenshot: `${SITE.replace(/\/$/, "")}/og-image.png`,
    softwareVersion: "1.0",
    inLanguage: "en-US",
    isAccessibleForFree: true,
    keywords:
      "file converter, image converter, convertek, PNG to WebP, PDF converter, free online converter",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
