import { Metadata } from "next";
import { formats } from "@/lib/formats";
import FormatDetailClient from "@/components/pages/FormatDetailClient";

interface Props {
  params: Promise<{ format: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { format: ext } = await params;
  const format = formats.find((f) => f.ext === ext);

  if (!format) {
    return {
      title: "Format Not Found",
      description: "The requested file format is not supported.",
    };
  }

  const title = `Convert ${format.ext.toUpperCase()} Files Online — ${format.name}`;
  const description = `Free online ${format.ext.toUpperCase()} converter. ${format.description.slice(0, 150)}... Convert ${format.ext} to ${format.targetFormats.slice(0, 5).join(", ")} and more.`;

  return {
    title,
    description,
    keywords: [
      `convert ${format.ext}`,
      `${format.ext} converter`,
      `${format.ext} to pdf`,
      `online ${format.ext} converter`,
      ...format.targetFormats.map((t) => `${format.ext} to ${t}`),
    ],
    alternates: {
      canonical: `/conversions/${ext}`,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: `Convert ${format.ext} files online`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.svg"],
    },
  };
}

export default async function Page({ params }: Props) {
  const { format: ext } = await params;
  return <FormatDetailClient ext={ext} />;
}

// Generate static params for all supported formats for better performance
export async function generateStaticParams() {
  return formats.map((f) => ({
    format: f.ext,
  }));
}
