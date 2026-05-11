export default function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Cloud Converter",
    description: "Universal file converter supporting 100+ formats including images, documents, data files, subtitles, and more. Self-hosted, private, and free forever.",
    url: "https://cloudconverter.dev",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      priceValidUntil: "2030-12-31",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1250",
      bestRating: "5",
      worstRating: "1",
    },
    author: {
      "@type": "Organization",
      name: "Cloud Converter Team",
      url: "https://cloudconverter.dev",
    },
    featureList: [
      "Image conversion (PNG, JPG, WebP, AVIF, SVG, and 50+ formats)",
      "Document conversion (PDF, DOCX, MD, HTML, and more)",
      "Data file conversion (JSON, YAML, CSV, XML, and more)",
      "Video and audio conversion",
      "Ebook format conversion",
      "Archive extraction and conversion",
      "Subtitle format conversion",
      "Font format conversion",
      "No file size limits",
      "100% private and self-hosted",
      "No watermarks",
      "Free forever",
      "REST API access",
      "Batch conversion",
      "Quality presets",
      "Resize and compress options",
    ],
    screenshot: "https://cloudconverter.dev/og-image.svg",
    softwareVersion: "1.0",
    inLanguage: "en-US",
    isAccessibleForFree: true,
    mainEntity: {
      "@type": "WebApplication",
      name: "Cloud Converter",
      url: "https://cloudconverter.dev",
      applicationCategory: "UtilityApplication",
      operatingSystem: "Any",
      browserRequirements: "Modern browser with JavaScript enabled",
    },
    keywords: "file converter, image converter, format converter, PNG to WebP, PDF converter, JSON converter, free file converter, online converter",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
