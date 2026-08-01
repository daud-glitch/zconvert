import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import JsonLd from "@/components/json-ld";
import { AppProvider } from "@/lib/app-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://cloudconverter.dev",
  ),
  title: {
    default: "Cloud Converter — Universal File Converter",
    template: "%s | Cloud Converter",
  },
  description:
    "Convert images, documents, data files, subtitles, and more. Self-hosted, private, no limits. Free online file converter supporting 100+ formats including PNG, WebP, PDF, JSON, and more.",
  keywords: [
    "file converter",
    "image converter",
    "format converter",
    "PNG to WebP",
    "PDF converter",
    "JSON converter",
    "JPG to PNG",
    "image compression",
    "file format conversion",
    "document converter",
    "self-hosted",
    "free file converter",
    "online converter",
    "convert images",
    "convert documents",
  ],
  authors: [{ name: "Cloud Converter Team" }],
  creator: "Cloud Converter",
  publisher: "Cloud Converter",
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cloudconverter.dev",
    siteName: "Cloud Converter",
    title: "Cloud Converter — Universal File Converter",
    description:
      "Convert images, documents, data files, subtitles, and more. Self-hosted, private, no limits. Free online file converter supporting 100+ formats.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Cloud Converter - Universal File Converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud Converter — Universal File Converter",
    description:
      "Convert images, documents, data files, subtitles, and more. Self-hosted, private, no limits.",
    images: ["/og-image.svg"],
    creator: "@cloudconverter",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1 as const,
      "max-image-preview": "large" as const,
      "max-snippet": -1 as const,
    },
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
          }}
        />
        <JsonLd />
        <AppProvider>{children}</AppProvider>
        <Toaster />
      </body>
    </html>
  );
}
