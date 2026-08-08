import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Convertek support for conversion issues, feedback, or partnership questions. We read every message.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Convertek",
    description:
      "Get help with Convertek conversions, report a format issue, or send feedback.",
    url: "https://www.convertek.tech/contact",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact | Convertek",
    description:
      "Get help with Convertek conversions, report a format issue, or send feedback.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
