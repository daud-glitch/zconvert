import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import JsonLd from "@/components/json-ld";
import { AppProvider } from "@/lib/app-context";
import { TrafficTracker } from "@/components/analytics/TrafficTracker";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { ADSENSE_CLIENT, ADSENSE_SRC, adsConsentBootstrapScript } from "@/lib/ads";
import {
  BRAND_ASSET_VERSION,
  BRAND_TAGLINE,
  BRAND_TAGLINE_ACTION,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  OG_DESCRIPTION,
  OG_IMAGE_PATH,
  SITE_NAME,
  SITE_URL,
  TWITTER_DESCRIPTION,
} from "@/lib/seo";

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
        url: OG_IMAGE_PATH,
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
    images: [OG_IMAGE_PATH],
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
      {
        url: `/favicon-32.png?v=${BRAND_ASSET_VERSION}`,
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: `/favicon-64.png?v=${BRAND_ASSET_VERSION}`,
        sizes: "64x64",
        type: "image/png",
      },
      {
        url: `/icon-192.png?v=${BRAND_ASSET_VERSION}`,
        sizes: "192x192",
        type: "image/png",
      },
      { url: `/favicon.ico?v=${BRAND_ASSET_VERSION}`, sizes: "any" },
      {
        url: `/favicon.svg?v=${BRAND_ASSET_VERSION}`,
        type: "image/svg+xml",
      },
    ],
    shortcut: [
      `/favicon-32.png?v=${BRAND_ASSET_VERSION}`,
      `/favicon.ico?v=${BRAND_ASSET_VERSION}`,
    ],
    apple: [
      {
        url: `/apple-touch-icon.png?v=${BRAND_ASSET_VERSION}`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  other: {
    "msapplication-TileColor": "#10b981",
    "msapplication-TileImage": `/icon-192.png?v=${BRAND_ASSET_VERSION}`,
    // AdSense site ownership signal; mirrors public/ads.txt and the loader below.
    "google-adsense-account": ADSENSE_CLIENT,
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
          href={`/logo-mark.webp?v=${BRAND_ASSET_VERSION}`}
          as="image"
          type="image/webp"
        />
        {/*
         * AdSense auto ads. Plain tags rather than next/script, and `defer`
         * rather than `async`: React hoists async scripts to the top of <head>,
         * which put the loader before the consent flag and made the flag
         * useless. With defer the document order holds — flag first, loader
         * second — and neither blocks parsing. The flag decides personalisation
         * for EEA visitors who have not opted in.
         */}
        <script
          id="adsense-consent"
          dangerouslySetInnerHTML={{ __html: adsConsentBootstrapScript() }}
        />
        <script
          id="adsense-loader"
          defer
          src={ADSENSE_SRC}
          crossOrigin="anonymous"
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
        <JsonLd />
        <AppProvider>
          {children}
          <TrafficTracker />
        </AppProvider>
        <CookieConsent />
        <Toaster />
      </body>
    </html>
  );
}
