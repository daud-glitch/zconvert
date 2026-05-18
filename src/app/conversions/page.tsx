import { Metadata } from "next";
import ConversionsClient from "@/components/pages/ConversionsClient";

export const metadata: Metadata = {
  title: "Supported File Formats — Cloud Converter",
  description:
    "Explore 100+ supported file formats for conversion. Images, documents, audio, data files, and more. Free, private, and high-quality online conversions.",
  keywords: [
    "supported formats",
    "file conversion list",
    "image formats",
    "document formats",
    "audio formats",
    "data formats",
    "archive formats",
  ],
  alternates: {
    canonical: "/conversions",
  },
};

export default function Page() {
  return <ConversionsClient />;
}
