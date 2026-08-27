import type { Metadata } from "next";
import Link from "next/link";
import { Coffee, Heart, Landmark, Mail } from "lucide-react";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getDonationSettings } from "@/lib/donation-settings";
import { OG_IMAGE_PATH } from "@/lib/seo";

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

  const bankMailto = `mailto:${contactEmail}?subject=${encodeURIComponent("Bank transfer / IBAN request")}&body=${encodeURIComponent("Hi Convertek team,\n\nI would like to donate via bank transfer. Please send IBAN and account details.\n\nThank you.\n")}`;

  const platforms = [
    kofiUrl
      ? { id: "kofi", label: "Ko-fi", href: kofiUrl, icon: Coffee }
      : null,
    paypalUrl
      ? { id: "paypal", label: "PayPal", href: paypalUrl, icon: Heart }
      : null,
    buyMeACoffeeUrl
      ? {
          id: "bmc",
          label: "Buy Me a Coffee",
          href: buyMeACoffeeUrl,
          icon: Coffee,
        }
      : null,
  ].filter(Boolean) as {
    id: string;
    label: string;
    href: string;
    icon: typeof Heart;
  }[];

  return (
    <LegalPageShell title="Support Convertek" updated={UPDATED}>
      <p>
        Convertek is built to stay a{" "}
        <strong className="text-foreground">free online file converter</strong>
        — no paywall for basic conversion,{" "}
        <strong className="text-foreground">no ads</strong>, and{" "}
        <strong className="text-foreground">no subscription</strong> required
        to use the product.
      </p>

      <p>
        Running conversions still costs real money: servers, bandwidth, storage,
        and the engines that process images, documents, data, media, and
        archives. We cover that ourselves so you can convert without clutter or
        forced upgrades.
      </p>

      <h2>Why we ask (gently)</h2>
      <ul>
        <li>
          Keep the site <strong className="text-foreground">ads-free</strong> —
          no ad networks competing with your workflow.
        </li>
        <li>
          Stay{" "}
          <strong className="text-foreground">subscription-free</strong> for
          everyday conversion — accounts are optional for history and bookmarks,
          not a gate to convert.
        </li>
        <li>
          Help pay{" "}
          <strong className="text-foreground">server and ops costs</strong> so
          formats keep working and the queue stays available.
        </li>
      </ul>

      <h2>Online tips</h2>
      {platforms.length > 0 ? (
        <>
          <p>
            Prefer a quick online tip? Use any link below — no account on our
            site is required.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <a
                  key={p.id}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white no-underline hover:bg-emerald-600"
                >
                  <Icon className="mr-2 h-4 w-4" aria-hidden />
                  {p.label}
                </a>
              );
            })}
          </div>
        </>
      ) : (
        <p>
          Online tip links (Ko-fi, PayPal, Buy Me a Coffee) will appear here once
          they are configured. Until then, use bank transfer or email below.
        </p>
      )}

      <h2>Bank transfer (IBAN)</h2>
      <p>
        Prefer a bank transfer? We can share{" "}
        <strong className="text-foreground">IBAN and account details</strong>{" "}
        privately — we do not publish full banking numbers on this page.
      </p>
      <p>
        Email{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a> and ask for bank
        transfer details. We will reply with IBAN, account title, and bank name.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={bankMailto}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground no-underline hover:bg-muted"
        >
          <Landmark className="mr-2 h-4 w-4" aria-hidden />
          Request IBAN by email
        </a>
        <a
          href={`mailto:${contactEmail}`}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground no-underline hover:bg-muted"
        >
          <Mail className="mr-2 h-4 w-4" aria-hidden />
          {contactEmail}
        </a>
      </div>

      <h2>Thank you</h2>
      <p>
        Whether you donate or simply use the converter, thank you for being
        here. Every conversion that works cleanly is why we keep building.
      </p>

      <p>
        Back to the{" "}
        <Link href="/" className="text-emerald-600">
          converter
        </Link>
        , or read{" "}
        <Link href="/about" className="text-emerald-600">
          about Convertek
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
