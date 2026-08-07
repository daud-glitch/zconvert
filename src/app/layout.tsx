import type { Metadata } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import JsonLd from "@/components/json-ld";
import { AppProvider } from "@/lib/app-context";
import { TrafficTracker } from "@/components/analytics/TrafficTracker";

/** One UI font only — lighter first load (no separate mono Google font). */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.convertek.tech",
  ),
  title: {
    default: "Convertek — Universal File Converter",
    template: "%s | Convertek",
  },
  description:
    "Convert images, documents, data, audio, and video online — mix different file types in one batch and pick a separate format per file. Temporary processing, local browser history, fair limits (30 MB per file · 100 MB video), no watermarks.",
  keywords: [
    "file converter",
    "image converter",
    "format converter",
    "batch converter",
    "mixed file conversion",
    "convertek",
    "PNG to WebP",
    "PDF converter",
    "JSON converter",
    "JPG to PNG",
    "image compression",
    "file format conversion",
    "document converter",
    "free file converter",
    "online converter",
    "convert images",
    "convert documents",
  ],
  authors: [{ name: "Convertek" }],
  creator: "Convertek",
  publisher: "Convertek",
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
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.convertek.tech",
    siteName: "Convertek",
    title: "Convertek — Universal File Converter",
    description:
      "Convert images, documents, data, audio, and video online. Mix different file types in one batch — choose a separate output format per file. Temporary processing, local history, fair limits, no watermarks.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Convertek — www.convertek.tech",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Convertek — Universal File Converter",
    description:
      "Convert images, documents, data, audio, and video online. Mixed-type batch with per-file formats. Fair limits, no watermarks.",
    images: ["/og-image.png"],
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
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/logo-mark.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon-32.png", "/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
        className={`${geistSans.variable} antialiased bg-background text-foreground`}
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
        <AppProvider>
          {children}
          <TrafficTracker />
        </AppProvider>
        <Toaster />
      </body>
    </html>
  );
}
