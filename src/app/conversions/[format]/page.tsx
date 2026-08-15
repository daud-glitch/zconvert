import type { Metadata } from "next";
import { formats } from "@/lib/formats";
import FormatDetailClient from "@/components/pages/FormatDetailClient";
import { FormatJsonLd } from "@/components/format-json-ld";
import {
  formatPageDescription,
  formatPageTitle,
  OG_IMAGE_PATH,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo";

interface Props {
  params: Promise<{ format: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { format: ext } = await params;
  const format = formats.find((f) => f.ext === ext);

  if (!format) {
    return {
      title: "Format Not Found",
      description: "The requested file format is not supported on Convertek.",
      robots: { index: false, follow: true },
    };
  }

  const title = formatPageTitle(format.ext, format.name);
  const description = formatPageDescription(
    format.ext,
    format.name,
    format.description,
    format.targetFormats,
  );
  const upper = format.ext.toUpperCase();
  const path = `/conversions/${ext}`;

  return {
    title,
    description,
    keywords: [
      `convert ${format.ext}`,
      `${format.ext} converter`,
      `online ${format.ext} converter`,
      `free ${format.ext} converter`,
      `${upper} to ${format.targetFormats[0] || "file"}`,
      ...format.targetFormats
        .slice(0, 12)
        .map((t) => `${format.ext} to ${t}`),
      format.name,
      format.category,
      "file converter",
      "free online converter",
      SITE_NAME,
    ],
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(path),
      type: "website",
      siteName: SITE_NAME,
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `Convert ${upper} files online free with ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [OG_IMAGE_PATH],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function Page({ params }: Props) {
  const { format: ext } = await params;
  const format = formats.find((f) => f.ext === ext);

  return (
    <>
      {format ? <FormatJsonLd format={format} /> : null}
      <FormatDetailClient ext={ext} />
    </>
  );
}

export async function generateStaticParams() {
  return formats.map((f) => ({
    format: f.ext,
  }));
}
