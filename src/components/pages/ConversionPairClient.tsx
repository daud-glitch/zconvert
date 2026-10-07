"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/common/BrandMark";
import { BrandTitle } from "@/components/common/BrandTitle";
import { SiteFooter } from "@/components/common/SiteFooter";
import { PairGuideSection } from "@/components/pages/PairGuideSection";
import { Moon, Sun, ChevronRight, RefreshCw, Upload, Download, Settings2, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ResolvedPair } from "@/lib/conversion-pairs";
import { getRelatedPairs } from "@/lib/conversion-pairs";
import { categoryMeta } from "@/lib/formats";
import { PAIR_FAQS } from "@/components/seo/ConversionPairJsonLd";

export default function ConversionPairClient({ pair }: { pair: ResolvedPair }) {
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

  const { from, to } = pair;
  const fromUpper = from.ext.toUpperCase();
  const toUpper = to.ext.toUpperCase();

  const relatedPairs = getRelatedPairs(from.ext, to.ext);
  const faqs = PAIR_FAQS(fromUpper, toUpper, from.name, to.name);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Accent bar */}
      <div className="h-1 bg-emerald-500" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <BrandMark className="h-9 w-9" rounded="rounded-lg" />
              <BrandTitle className="text-xl font-bold tracking-tight text-foreground" />
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Converter
                </Button>
              </Link>
              <Link href="/conversions">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  All Formats
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleDark}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/conversions" className="transition-colors hover:text-foreground">
            Conversions
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/conversions/${from.ext}`} className="font-mono font-semibold uppercase transition-colors hover:text-foreground">
            {from.ext}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono font-semibold uppercase text-foreground">TO {to.ext}</span>
        </div>

        {/* Hero Section */}
        <div className="mb-12 overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative p-8 sm:p-12">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex items-center justify-center gap-3">
                <Badge variant="secondary" className="bg-muted text-base uppercase px-3 py-1">.{from.ext}</Badge>
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary" className="bg-muted text-base uppercase px-3 py-1">.{to.ext}</Badge>
              </div>
              <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                Convert <span className="text-emerald-500">{fromUpper}</span> to{" "}
                <span className="text-emerald-500">{toUpper}</span>
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Free, fast, and secure online conversion from {from.name} to {to.name}. No watermarks, no registration required.
              </p>
              {/* Plain homepage link — `?from=`/`?to=` now 301s to this
                  very page, so linking to it would bounce the user back. */}
              <Link href="/">
                <Button size="lg" className="h-14 gap-2 rounded-xl bg-emerald-500 px-8 text-base hover:bg-emerald-600 font-semibold text-white">
                  Convert {fromUpper} to {toUpper} Now
                </Button>
              </Link>
            </div>
            
            {/* Background decorative elements */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-10">
              <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-emerald-500 blur-3xl"></div>
              <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-violet-500 blur-3xl"></div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">How to convert {fromUpper} to {toUpper}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center text-center rounded-2xl border border-border bg-muted/20 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">1. Upload {fromUpper}</h3>
              <p className="text-sm text-muted-foreground">Select or drag and drop your {from.name} file into the converter.</p>
            </div>
            <div className="flex flex-col items-center text-center rounded-2xl border border-border bg-muted/20 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                <Settings2 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">2. Choose {toUpper}</h3>
              <p className="text-sm text-muted-foreground">Select {toUpper} as your output format. You can process multiple files at once.</p>
            </div>
            <div className="flex flex-col items-center text-center rounded-2xl border border-border bg-muted/20 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">3. Download</h3>
              <p className="text-sm text-muted-foreground">Click convert and download your new {to.name} file instantly.</p>
            </div>
          </div>
        </div>

        {/* Format Comparison */}
        <div className="mb-16 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="text-xl font-semibold">Format Details</h2>
          </div>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-sm">.{from.ext}</Badge>
                <h3 className="font-semibold">{from.name}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                {from.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-normal capitalize">{from.category}</Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-sm">.{to.ext}</Badge>
                <h3 className="font-semibold">{to.name}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                {to.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-normal capitalize">{to.category}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Editorial content — unique per category pairing */}
        <PairGuideSection pair={pair} />

        {/* FAQ Section */}
        <section id="faq" className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-2 font-semibold">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Pairs */}
        {relatedPairs.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-6 text-xl font-semibold">Popular Conversions</h2>
            <div className="flex flex-wrap gap-3">
              {relatedPairs.map((rp) => (
                <Link key={`${rp.from}-${rp.to}`} href={`/${rp.from}-to-${rp.to}`}>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-normal hover:bg-muted transition-colors"
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

function ArrowRightIcon(props: any) {
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
