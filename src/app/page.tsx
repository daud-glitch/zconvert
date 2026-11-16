import type { Metadata } from "next";
import HomeClient from "@/components/pages/HomeClient";
import HomeFaqJsonLd from "@/components/seo/HomeFaqJsonLd";
import type { GuideTeaser } from "@/components/seo/HomeGuidesSection";
import { guides } from "@/lib/guides";
import { getFormatByExt } from "@/lib/formats";
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
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  // Canonical stays on the clean homepage so `/?from=&to=` tool deep-links
  // do not create indexed duplicates of /x-to-y SEO pair pages.
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${DEFAULT_TITLE} | ${SITE_NAME}`,
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
    title: `${DEFAULT_TITLE} | ${SITE_NAME}`,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

/** High-intent guides that earn a card on the homepage. */
const HOMEPAGE_GUIDE_SLUGS = [
  "heic-to-jpg-guide",
  "png-to-jpg-guide",
  "pdf-to-jpg-guide",
  "mov-to-mp4-guide",
];

const homepageGuides: GuideTeaser[] = HOMEPAGE_GUIDE_SLUGS.flatMap((slug) => {
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) return [];
  const extension = guide.related[0]?.from ?? guide.relatedFormats[0];
  const format = extension ? getFormatByExt(extension) : undefined;
  return [
    {
      slug: guide.slug,
      title: guide.title,
      description: guide.description,
      readingMinutes: guide.readingMinutes,
      format: format ? { extension: format.ext, category: format.category } : undefined,
    },
  ];
});

export default function Page() {
  return (
    <>
      <HomeFaqJsonLd />
      <HomeClient defaultView="converter" guides={homepageGuides} />
    </>
  );
}
