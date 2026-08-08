import { Metadata } from "next";
import ConversionsClient from "@/components/pages/ConversionsClient";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const title = "Supported File Formats — 100+ Conversions";
const description =
  "Browse 100+ supported file formats on Convertek: images, PDF, documents, data, audio, video, archives, fonts, subtitles, presentations & ebooks. Free online conversion with no watermarks.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "supported formats",
    "file conversion list",
    "image formats",
    "document formats",
    "audio formats",
    "video formats",
    "data formats",
    "archive formats",
    "PDF converter formats",
    "free online converter formats",
    SITE_NAME,
  ],
  alternates: {
    canonical: "/conversions",
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: `${SITE_URL}/conversions`,
    type: "website",
    siteName: SITE_NAME,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} supported formats`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ConversionsClient />;
}
