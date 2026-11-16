"use client";

import { Suspense, type SVGProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SiteHeader } from "@/components/common/SiteHeader";
import { ConverterWorkspaceLoading, type ConverterWorkspaceIntro } from "@/components/converter/ConverterWorkspace";
import { SiteFooter } from "@/components/common/SiteFooter";
import { PairGuideSection } from "@/components/pages/PairGuideSection";
import {
  ChevronRight,
  Upload,
  Download,
  Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ResolvedPair } from "@/lib/conversion-pairs";
import { getRelatedPairs } from "@/lib/conversion-pairs";
import { PAIR_FAQS } from "@/components/seo/ConversionPairJsonLd";

const ConverterView = dynamic(
  () =>
    import("@/components/converter/ConverterView").then((m) => m.ConverterView),
);

export default function ConversionPairClient({ pair }: { pair: ResolvedPair }) {
  const { from, to } = pair;
  const fromUpper = from.ext.toUpperCase();
  const toUpper = to.ext.toUpperCase();

  const workspace: ConverterWorkspaceIntro = {
    title: `Convert ${fromUpper} to ${toUpper}`,
    description: `${from.name} to ${to.name}. No watermarks or sign-up required.`,
    files: [
      { type: from.category, extension: from.ext },
      { type: to.category, extension: to.ext },
    ],
  };
  const relatedPairs = getRelatedPairs(from.ext, to.ext);
  const faqs = PAIR_FAQS(fromUpper, toUpper, from.name, to.name);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader section="/conversions" />

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

        <section id="converter" aria-label={`${fromUpper} to ${toUpper} converter`} className="mb-12 min-w-0 scroll-mt-24">
          <Suspense fallback={<ConverterWorkspaceLoading intro={workspace} />}>
            <ConverterView embedded initialFrom={from.ext} initialTo={to.ext} workspace={workspace} />
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
