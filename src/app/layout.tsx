import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import JsonLd from "@/components/json-ld";
import { AppProvider } from "@/lib/app-context";
import { TrafficTracker } from "@/components/analytics/TrafficTracker";
import {
  BRAND_TAGLINE,
  BRAND_TAGLINE_ACTION,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  OG_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TWITTER_DESCRIPTION,
} from "@/lib/seo";
import { isTurnstileBypassed } from "@/lib/turnstile-config";

/** One UI font only — lighter first load (no separate mono Google font). */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [...DEFAULT_KEYWORDS],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  classification: "File Converter Utility",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      en: "/",
      "x-default": "/",
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${BRAND_TAGLINE} ${BRAND_TAGLINE_ACTION}`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: TWITTER_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1 as const,
      "max-image-preview": "large" as const,
      "max-snippet": -1 as const,
    },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.BING_SITE_VERIFICATION ||
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.GOOGLE_SITE_VERIFICATION ||
          process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
            ? {
                google:
                  process.env.GOOGLE_SITE_VERIFICATION ||
                  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
              }
            : {}),
          ...(process.env.BING_SITE_VERIFICATION ||
          process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? {
                other: {
                  "msvalidate.01":
                    process.env.BING_SITE_VERIFICATION ||
                    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
                    "",
                },
              }
            : {}),
        },
      }
    : {}),
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon-32.png", "/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  other: {
    "msapplication-TileColor": "#10b981",
    "msapplication-TileImage": "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/logo-mark.webp?v=4"
          as="image"
          type="image/webp"
        />
      </head>
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
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !isTurnstileBypassed() ? (
          <Script
            id="cf-turnstile-script"
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="lazyOnload"
          />
        ) : null}
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
