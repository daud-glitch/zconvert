"use client";

import {
  Suspense,
  useState,
  useEffect,
  useRef,
  type SVGProps,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BrandMark } from "@/components/common/BrandMark";
import { BrandTitle } from "@/components/common/BrandTitle";
import { SiteFooter } from "@/components/common/SiteFooter";
import { PairGuideSection } from "@/components/pages/PairGuideSection";
import {
  Moon,
  Sun,
  ChevronRight,
  RefreshCw,
  Upload,
  Download,
  Settings2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResolvedPair } from "@/lib/conversion-pairs";
import { getRelatedPairs } from "@/lib/conversion-pairs";
import { PAIR_FAQS } from "@/components/seo/ConversionPairJsonLd";

const ConverterView = dynamic(
  () =>
    import("@/components/converter/ConverterView").then((m) => m.ConverterView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500" aria-hidden />
        <span className="sr-only">Loading converter…</span>
      </div>
    ),
  },
);

export default function ConversionPairClient({ pair }: { pair: ResolvedPair }) {
  const converterRef = useRef<HTMLElement | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : false;
    return saved ? saved === "dark" : prefersDark;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleDark = () => {
    setDarkMode((d) => {
      const next = !d;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const scrollToConverter = () => {
    converterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const { from, to } = pair;
  const fromUpper = from.ext.toUpperCase();
  const toUpper = to.ext.toUpperCase();

  const relatedPairs = getRelatedPairs(from.ext, to.ext);
  const faqs = PAIR_FAQS(fromUpper, toUpper, from.name, to.name);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="h-1 bg-emerald-500" />

      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <BrandMark className="h-9 w-9" rounded="rounded-lg" />
              <BrandTitle className="text-xl font-bold tracking-tight text-foreground" />
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Converter
                </Button>
              </Link>
              <Link href="/conversions" aria-current="page">
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-emerald-500/10 font-semibold text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-400"
                >
                  All Formats
                </Button>
              </Link>
              <Link href="/guides">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Guides
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleDark}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8 sm:py-10">
        <div className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/conversions" className="transition-colors hover:text-foreground">
            Conversions
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/conversions/${from.ext}`}
            className="font-mono font-semibold uppercase transition-colors hover:text-foreground"
          >
            {from.ext}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono font-semibold uppercase text-foreground">
            TO {to.ext}
          </span>
        </div>

        {/* Compact hero — one job: name the pair + start converting */}
        <div className="mb-8 text-center sm:mb-10">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Badge variant="secondary" className="bg-muted px-3 py-1 text-base uppercase">
              .{from.ext}
            </Badge>
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <Badge variant="secondary" className="bg-muted px-3 py-1 text-base uppercase">
              .{to.ext}
            </Badge>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Convert <span className="text-emerald-500">{fromUpper}</span> to{" "}
            <span className="text-emerald-500">{toUpper}</span>
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Free, fast {from.name} → {to.name}. No watermarks, no sign-up.
          </p>
          <Button
            size="lg"
            className="h-12 gap-2 rounded-xl bg-emerald-500 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600"
            onClick={scrollToConverter}
          >
            <Upload className="h-5 w-5" />
            Convert {fromUpper} to {toUpper} Now
          </Button>
        </div>

        {/* Live converter — pair already selected */}
        <section
          id="converter"
          ref={converterRef}
          className="mb-14 scroll-mt-24"
          aria-label={`${fromUpper} to ${toUpper} converter`}
        >
          <Suspense
            fallback={
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-card">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
              </div>
            }
          >
            <ConverterView
              embedded
              initialFrom={from.ext}
              initialTo={to.ext}
            />
          </Suspense>
        </section>

        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            How to convert {fromUpper} to {toUpper}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center rounded-2xl border border-border bg-muted/20 p-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">1. Upload {fromUpper}</h3>
              <p className="text-sm text-muted-foreground">
                Drop your {from.name} file into the converter above.
              </p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border bg-muted/20 p-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                <Settings2 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">2. Confirm {toUpper}</h3>
              <p className="text-sm text-muted-foreground">
                Output is already set to {toUpper}. Adjust only if you need to.
              </p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border bg-muted/20 p-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">3. Download</h3>
              <p className="text-sm text-muted-foreground">
                Convert and download your {to.name} file instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="text-xl font-semibold">Format Details</h2>
          </div>
          <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-sm">
                  .{from.ext}
                </Badge>
                <h3 className="font-semibold">{from.name}</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {from.description}
              </p>
              <Badge variant="secondary" className="font-normal capitalize">
                {from.category}
              </Badge>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-sm">
                  .{to.ext}
                </Badge>
                <h3 className="font-semibold">{to.name}</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {to.description}
              </p>
              <Badge variant="secondary" className="font-normal capitalize">
                {to.category}
              </Badge>
            </div>
          </div>
        </div>

        <PairGuideSection pair={pair} />

        <section id="faq" className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-2 font-semibold">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {relatedPairs.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-6 text-xl font-semibold">Popular Conversions</h2>
            <div className="flex flex-wrap gap-3">
              {relatedPairs.map((rp) => (
                <Link key={`${rp.from}-${rp.to}`} href={`/${rp.from}-to-${rp.to}`}>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-normal transition-colors hover:bg-muted"
                  >
                    <span className="font-mono uppercase">{rp.from}</span>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono uppercase">{rp.to}</span>
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
