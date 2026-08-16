import { SITE_URL, SITE_NAME } from "@/lib/seo";

interface ConversionPairJsonLdProps {
  fromExt: string;
  fromName: string;
  toExt: string;
  toName: string;
  slug: string;
}

const PAIR_FAQS = (fromUpper: string, toUpper: string, fromName: string, toName: string) => [
  {
    question: `How do I convert ${fromUpper} to ${toUpper}?`,
    answer: `Upload your ${fromUpper} file on Convertek, select ${toUpper} as the output format, then click Convert. Your ${toUpper} file will be ready to download instantly.`,
  },
  {
    question: `Is the ${fromUpper} to ${toUpper} converter free?`,
    answer: `Yes. Converting ${fromName} to ${toName} on Convertek is completely free with no watermarks. Fair upload limits apply (typically 30 MB per file).`,
  },
  {
    question: `Is my file kept after conversion?`,
    answer: `No. Files are processed temporarily and not stored permanently. Converted downloads are available only in your browser session.`,
  },
  {
    question: `What is the difference between ${fromUpper} and ${toUpper}?`,
    answer: `${fromName} and ${toName} are different file formats with distinct use cases. Converting between them lets you use your file in software or workflows that require the ${toUpper} format.`,
  },
];

export default function ConversionPairJsonLd({
  fromExt,
  fromName,
  toExt,
  toName,
  slug,
}: ConversionPairJsonLdProps) {
  const fromUpper = fromExt.toUpperCase();
  const toUpper = toExt.toUpperCase();
  const pageUrl = `${SITE_URL}/${slug}`;
  const faqs = PAIR_FAQS(fromUpper, toUpper, fromName, toName);

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: `How to convert ${fromUpper} to ${toUpper}`,
    description: `Step-by-step guide to converting ${fromName} files to ${toName} online for free using ${SITE_NAME}.`,
    totalTime: "PT1M",
    tool: [{ "@type": "HowToTool", name: SITE_NAME }],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: `Upload your ${fromUpper} file`,
        text: `Click the upload area or drag and drop your ${fromUpper} file onto the converter.`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: `Select ${toUpper} as the output format`,
        text: `Choose ${toUpper} (${toName}) from the output format selector.`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Convert and download",
        text: `Click Convert. Once processing completes, download your ${toUpper} file instantly.`,
      },
    ],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}

export { PAIR_FAQS };
