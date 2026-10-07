import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Coffee,
  CreditCard,
  Heart,
  Landmark,
  Mail,
  Server,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { getDonationSettings } from "@/lib/donation-settings";
import { OG_IMAGE_PATH } from "@/lib/seo";
import { SiteFooter } from "@/components/common/SiteFooter";

const SITE = "https://www.convertek.tech";
const UPDATED = "August 27, 2026";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support Convertek — we keep the converter ads-free and subscription-free. Optional donations help cover server and conversion costs.",
  alternates: { canonical: "/donate" },
  openGraph: {
    title: "Donate | Support Convertek",
    description:
      "Help keep Convertek free, ads-free, and without subscriptions. Donations cover real server costs.",
    url: `${SITE}/donate`,
    type: "website",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Donate | Convertek",
    description:
      "Optional support to keep Convertek ads-free and subscription-free.",
  },
};

export default async function DonatePage() {
  const { kofiUrl, paypalUrl, buyMeACoffeeUrl, contactEmail } =
    await getDonationSettings();

  const bankMailto = `mailto:${contactEmail}?subject=${encodeURIComponent(
    "Bank transfer / IBAN request",
  )}&body=${encodeURIComponent(
    "Hi Convertek team,\n\nI would like to donate via bank transfer. Please send IBAN and account details.\n\nThank you.\n",
  )}`;

  const platforms = [
    kofiUrl
      ? {
          id: "kofi",
          label: "Ko-fi",
          href: kofiUrl,
          blurb: "One-tap tip — great for a quick thank-you.",
          icon: Coffee,
          tone: "bg-rose-500 hover:bg-rose-600",
        }
      : null,
    paypalUrl
      ? {
          id: "paypal",
          label: "PayPal",
          href: paypalUrl,
          blurb: "Familiar checkout if you already use PayPal.",
          icon: CreditCard,
          tone: "bg-sky-600 hover:bg-sky-700",
        }
      : null,
    buyMeACoffeeUrl
      ? {
          id: "bmc",
          label: "Buy Me a Coffee",
          href: buyMeACoffeeUrl,
          blurb: "Buy the team a coffee while conversions run.",
          icon: Coffee,
          tone: "bg-amber-500 hover:bg-amber-600",
        }
      : null,
  ].filter(Boolean) as {
    id: string;
    label: string;
    href: string;
    blurb: string;
    icon: typeof Heart;
    tone: string;
  }[];

  const reasons = [
    {
      icon: ShieldOff,
      title: "Stay ads-free",
      text: "No ad networks sitting next to your files or competing with your workflow.",
    },
    {
      icon: Ban,
      title: "No subscription wall",
      text: "Everyday conversion stays free. Accounts are optional for history and bookmarks.",
    },
    {
      icon: Server,
      title: "Keep servers online",
      text: "Tips help cover bandwidth, storage, and the engines behind image, document, data, and media conversions.",
    },
  ];

  return (
    <>
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(244,63,94,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.10),_transparent_50%)]" />
      <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-emerald-500 to-rose-400" />

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
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/30">
                <Heart className="h-3.5 w-3.5 fill-current" aria-hidden />
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                Optional support
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Keep Convertek free
              </h1>
            </div>
          </div>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:mx-0">
            Convertek is a{" "}
            <strong className="font-semibold text-foreground">
              free online file converter
            </strong>
            — no paywall for basic conversion,{" "}
            <strong className="font-semibold text-foreground">no ads</strong>,
            and{" "}
            <strong className="font-semibold text-foreground">
              no subscription
            </strong>{" "}
            required to use the product. Donations are optional; they simply
            help us cover real infrastructure costs.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {UPDATED}
          </p>
        </header>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {reasons.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/70 bg-background/80 p-4 backdrop-blur-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
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
            <Sparkles className="h-5 w-5 text-emerald-500" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">
              Online tips
            </h2>
          </div>
          {platforms.length > 0 ? (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Prefer a quick online tip? Pick a platform below — you do not
                need a Convertek account.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {platforms.map((p) => {
                  const Icon = p.icon;
                  return (
                    <a
                      key={p.id}
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-start gap-3 rounded-2xl px-4 py-4 text-white no-underline shadow-sm transition ${p.tone}`}
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-base font-semibold">
                          {p.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-white/90">
                          {p.blurb}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm leading-relaxed text-muted-foreground">
              Online tip links (Ko-fi, PayPal, Buy Me a Coffee) will appear here
              once they are set in Admin → Settings → Donations. Until then, use
              bank transfer or email below.
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-500" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">
              Bank transfer (IBAN)
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Prefer a bank transfer? We share{" "}
            <strong className="font-semibold text-foreground">
              IBAN and account details
            </strong>{" "}
            privately by email — we do not publish full banking numbers on this
            page.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Email{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium text-emerald-600 underline-offset-2 hover:underline"
            >
              {contactEmail}
            </a>{" "}
            and ask for bank transfer details. We will reply with IBAN, account
            title, and bank name.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={bankMailto}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-semibold text-background no-underline transition hover:opacity-90"
            >
              <Landmark className="h-4 w-4" aria-hidden />
              Request IBAN by email
            </a>
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background/80 px-5 text-sm font-semibold text-foreground no-underline transition hover:bg-muted"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {contactEmail}
            </a>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-6 text-center sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
              <Heart className="h-5 w-5 fill-current" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Thank you
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Whether you donate or simply use the converter, thank you for
                being here. Every clean conversion is why we keep building.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Back to the{" "}
                <Link
                  href="/"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline"
                >
                  converter
                </Link>
                , or read{" "}
                <Link
                  href="/about"
                  className="font-medium text-emerald-600 underline-offset-2 hover:underline"
                >
                  about Convertek
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
