import type { FormatInfo } from "@/lib/formats";
import {
  formatPageDescription,
  formatPageTitle,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

/** Per-format structured data for conversion landing pages. */
export function FormatJsonLd({ format }: { format: FormatInfo }) {
  const upper = format.ext.toUpperCase();
  const path = `/conversions/${format.ext}`;
  const url = `${SITE_URL}${path}`;
  const title = formatPageTitle(format.ext, format.name);
  const description = formatPageDescription(
    format.ext,
    format.name,
    format.description,
    format.targetFormats,
  );

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: {
          "@type": "Thing",
          name: `${upper} file format`,
        },
        inLanguage: "en-US",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Formats",
            item: `${SITE_URL}/conversions`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: upper,
            item: url,
          },
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: `${SITE_NAME} ${upper} Converter`,
        applicationCategory: "UtilityApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description,
        url,
        isAccessibleForFree: true,
        featureList: format.targetFormats
          .slice(0, 12)
          .map((t) => `Convert ${upper} to ${t.toUpperCase()}`),
      },
      {
        "@type": "HowTo",
        name: `How to convert ${upper} files online`,
        description: `Convert ${upper} files to ${format.targetFormats
          .slice(0, 5)
          .map((t) => t.toUpperCase())
          .join(", ")} with ${SITE_NAME}.`,
        totalTime: "PT1M",
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Upload",
            text: `Upload your ${upper} file (or a mixed batch including ${upper}).`,
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Choose format",
            text: `Select the target format for your ${upper} file.`,
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Convert & download",
            text: "Click Convert, then download your result — no watermarks.",
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
