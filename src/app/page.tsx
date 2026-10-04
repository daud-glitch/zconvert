import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import HomeClient from "@/components/pages/HomeClient";
import HomeFaqJsonLd from "@/components/seo/HomeFaqJsonLd";
import { parseConversionSlug, pairToSlug } from "@/lib/conversion-pairs";
import {
  BRAND_TAGLINE,
  BRAND_TAGLINE_ACTION,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  OG_DESCRIPTION,
  OG_IMAGE_PATH,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: DEFAULT_TITLE,
    description: OG_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${BRAND_TAGLINE} ${BRAND_TAGLINE_ACTION}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

/** Page props with search params — Next 15+ passes these as a promise. */
type Props = {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: Props) {
  // Legacy `/?from=X&to=Y` deep links are duplicates of the canonical pair
  // page. 301 them so link equity lands on /x-to-y instead of fragmenting
  // across ~1.2k query-string variants of the homepage.
  const params = await searchParams;
  const from = first(params.from);
  const to = first(params.to);
  if (from && to) {
    const slug = pairToSlug(
      from.trim().toLowerCase(),
      to.trim().toLowerCase(),
    );
    if (parseConversionSlug(slug)) {
      permanentRedirect(`/${slug}`);
    }
  }

  return (
    <>
      <HomeFaqJsonLd />
      <HomeClient defaultView="converter" />
    </>
  );
}