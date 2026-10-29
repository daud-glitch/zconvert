import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  FileStack,
  Globe,
  Layers,
  Lock,
  Mail,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { OG_IMAGE_PATH } from "@/lib/seo";
import { SiteFooter } from "@/components/common/SiteFooter";
import { SiteHeader } from "@/components/common/SiteHeader";

const SITE = "https://www.convertek.tech";
const CONTACT = "support@convertek.tech";
const UPDATED = "August 28, 2026";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Convertek — free online file converter with mixed-type batch conversion, per-file formats, no watermarks, and privacy-first temporary processing.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Convertek | Free Online File Converter",
    description:
      "Learn how Convertek converts files online: mixed batches, per-file formats, fair limits, and no watermarks.",
    url: `${SITE}/about`,
    type: "website",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Convertek",
    description:
      "Free online file converter — mixed batches, privacy-first processing, no watermarks.",
  },
};

const highlights = [
  {
    icon: Layers,
    title: "Mixed-type batch",
    text: "Drop PNG, PDF, MP3, and more in one queue — no need to split uploads by file type.",
  },
  {
    icon: FileStack,
    title: "Per-file formats",
    text: "Choose a separate output format for every file. You are not locked into one target for the whole batch.",
  },
  {
    icon: Lock,
    title: "Privacy-first",
    text: "Files are processed temporarily on the server. Converted downloads stay in your browser storage.",
  },
  {
    icon: Sparkles,
    title: "No watermarks",
    text: "Free conversions without branding your images, documents, or exports.",
  },
];

export default function AboutPage() {
  return (
    <>
    <SiteHeader />
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.08),_transparent_50%)]" />
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Converter
        </Link>

        <header className="text-center sm:text-left">
          <div className="mb-5 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <div className="relative">
              <BrandMark className="h-14 w-14 sm:h-16 sm:w-16" priority />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                <Globe className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                About us
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                About Convertek
              </h1>
            </div>
          </div>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:mx-0">
            Convertek (
            <a
              href={SITE}
              className="font-medium text-emerald-600 underline-offset-2 hover:underline"
            >
              {SITE.replace("https://", "")}
            </a>
            ) is a{" "}
            <strong className="font-semibold text-foreground">
              free online file converter
            </strong>{" "}
            for images, documents, data, audio, video, archives, fonts,
            subtitles, presentations, and ebooks — no watermarks, fair upload
            limits, and results you keep in your own browser.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {UPDATED}
          </p>
        </header>

        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/70 bg-background/80 p-4 backdrop-blur-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-500" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">
              How conversion works
            </h2>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-5 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Upload a file or batch, pick target format(s) for each item, and we
              convert on the server using engines suited to each type. When
              conversion finishes, you download the result. We do not keep a
              permanent personal cloud library of your files after processing.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-emerald-500" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">
              Accounts &amp; history
            </h2>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-5 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Guests can convert freely within fair limits. Creating an account
              unlocks synced bookmarks and durable conversion history in this
              browser for your sign-in. Bookmarks are stored with your account
              so you can reuse favorite conversion pairs.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-500" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">
              Contact &amp; support
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Questions, broken conversion reports, or feedback — use our{" "}
            <Link
              href="/contact"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline"
            >
              contact form
            </Link>{" "}
            or email{" "}
            <a
              href={`mailto:${CONTACT}`}
              className="font-medium text-emerald-600 underline-offset-2 hover:underline"
            >
              {CONTACT}
            </a>
            .
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white no-underline shadow-sm shadow-emerald-500/20 transition hover:bg-emerald-600"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Contact us
            </Link>
            <Link
              href="/donate"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background/80 px-5 text-sm font-semibold text-foreground no-underline transition hover:bg-muted"
            >
              Support Convertek
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-6 text-center sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Legal</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Read our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline"
                >
                  Terms of Service
                </Link>
                . See what&apos;s new on the{" "}
                <Link
                  href="/changelog"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline"
                >
                  changelog
                </Link>
                .
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Back to the{" "}
                <Link
                  href="/"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline"
                >
                  converter
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <p className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:text-left">
          Convertek ·{" "}
          <a
            href={SITE}
            className="text-emerald-600 underline-offset-2 hover:underline"
          >
            www.convertek.tech
          </a>
        </p>
      </div>
    </div>
      <SiteFooter />
    </>
  );
}
