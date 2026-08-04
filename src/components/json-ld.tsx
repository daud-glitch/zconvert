const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.cloudconveter.tech";

export default function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Cloud Converter",
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
      name: "Cloud Converter",
      url: SITE,
      email: "support@cloudconveter.tech",
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
    screenshot: `${SITE.replace(/\/$/, "")}/og-image.svg`,
    softwareVersion: "1.0",
    inLanguage: "en-US",
    isAccessibleForFree: true,
    keywords:
      "file converter, image converter, cloudconveter, PNG to WebP, PDF converter, free online converter",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
