/**
 * Central SEO / brand copy for Convertek.
 * Use this module for metadata, structured data, and consistent marketing lines.
 */

import type { FormatCategory, FormatInfo } from "@/lib/formats";

/** Public brand origin used in sitemap, robots, OG, JSON-LD. */
export const CANONICAL_SITE_URL = "https://www.convertek.tech";

const LEGACY_HOST_SNIPPETS = [
  "cloudconveter.tech",
  "cloudconverter.tech",
] as const;

/**
 * Resolve the public site origin.
 * Always prefers www.convertek.tech; rejects legacy cloud* domains even if
 * NEXT_PUBLIC_SITE_URL still points at them on deploy (sitemap used to leak those).
 * Localhost / 127.0.0.1 kept for local dev only.
 */
export function resolveSiteUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  const fallback = CANONICAL_SITE_URL;
  if (!raw?.trim()) return fallback;

  const trimmed = raw.trim().replace(/\/$/, "");
  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase();

    if (
      LEGACY_HOST_SNIPPETS.some((s) => host === s || host.endsWith(`.${s}`)) ||
      host.includes("cloudconveter") ||
      host.includes("cloudconverter")
    ) {
      return fallback;
    }

    // apex → www
    if (host === "convertek.tech") return fallback;

    // Local development
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    ) {
      return `${u.protocol}//${u.host}`.replace(/\/$/, "");
    }

    // Only allow convertek.tech host family for public SEO URLs
    if (host === "www.convertek.tech" || host.endsWith(".convertek.tech")) {
      return `https://${host}`;
    }

    // Heroku app hosts / unknown — do not publish in sitemap
    return fallback;
  } catch {
    return fallback;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "Convertek";
export const SITE_DOMAIN = "www.convertek.tech";
export const SITE_EMAIL = "support@convertek.tech";

/**
 * Bump when replacing favicon / OG binaries so Google & CDNs fetch a new URL
 * instead of keeping a stale cached asset at the same path.
 */
export const BRAND_ASSET_VERSION = "20260816";

export const OG_IMAGE_PATH = `/og-image.png?v=${BRAND_ASSET_VERSION}`;
export const OG_IMAGE_ABS = `${SITE_URL}${OG_IMAGE_PATH}`;

/** Primary brand line (nav / product mark / headline) */
export const BRAND_TAGLINE = "Any file. Any format.";

/** Secondary action line — pairs with BRAND_TAGLINE */
export const BRAND_TAGLINE_ACTION = "Drop it. Convert it. Download it.";

/** Combined for meta descriptions and footers */
export const BRAND_TAGLINE_PAIR = `${BRAND_TAGLINE} ${BRAND_TAGLINE_ACTION}`;

/**
 * Primary marketing tagline candidates — pick one for campaigns.
 * Live pair: BRAND_TAGLINE + BRAND_TAGLINE_ACTION.
 */
export const TAGLINE_OPTIONS = [
  "Any file. Any format.",
  "Drop it. Convert it. Download it.",
  "Convert anything. Watermark nothing.",
  "One queue. Every format.",
  "Mixed files. Perfect conversion.",
  "Free. Fast. Format-ready.",
  "Your files. Your formats. Your control.",
  "From PNG to PDF — and everything between.",
  "Batch convert without the lock-in.",
  "Privacy-first file conversion online.",
] as const;

export const DEFAULT_TITLE =
  "Convertek — Free Online File Converter | Images, PDF, Video & More";

export const DEFAULT_DESCRIPTION =
  "Free online file converter for images, PDF, documents, data, audio, video, archives, fonts & subtitles. Mix file types in one batch, pick a format per file. No watermarks. Fair limits (30 MB · 100 MB video).";

export const OG_DESCRIPTION =
  "Convert images, PDF, documents, audio, video & more online. Mixed-type batches, per-file formats, temporary processing, no watermarks.";

export const TWITTER_DESCRIPTION =
  "Free online converter: images, PDF, docs, audio, video & more. Mixed batches · no watermarks · privacy-first.";

export const DEFAULT_KEYWORDS = [
  "file converter",
  "online file converter",
  "free file converter",
  "image converter",
  "PDF converter",
  "document converter",
  "video converter",
  "audio converter",
  "format converter",
  "batch converter",
  "convert PNG to JPG",
  "convert JPG to PNG",
  "PNG to WebP",
  "PDF to image",
  "JSON converter",
  "CSV converter",
  "MP4 converter",
  "MP3 converter",
  "ZIP converter",
  "convert files online",
  "no watermark converter",
  "mixed file conversion",
  "Convertek",
  "convertek.tech",
] as const;

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatPageTitle(ext: string, name: string): string {
  const upper = ext.toUpperCase();
  return `Convert ${upper} Online Free — ${name} Converter`;
}

export function formatPageDescription(
  ext: string,
  name: string,
  description: string,
  targets: string[],
): string {
  const upper = ext.toUpperCase();
  const top = targets
    .slice(0, 6)
    .map((t) => t.toUpperCase())
    .join(", ");
  const short = description.replace(/\s+/g, " ").trim().slice(0, 110);
  return `Free online ${upper} (${name}) converter. ${short}${short.length >= 110 ? "…" : ""} Convert ${upper} to ${top}${targets.length > 6 ? " & more" : ""}. No watermarks.`;
}

/**
 * Strips a brand suffix a CMS editor may have typed into `seoTitle`.
 *
 * The root layout template already appends `| Convertek`, so a stored
 * "… — Convertek" rendered as "… — Convertek | Convertek" in search results.
 */
export function stripBrandSuffix(title: string): string {
  const cleaned = title
    .replace(new RegExp(`\\s*[|\u2013\u2014-]\\s*${SITE_NAME}\\s*$`, "i"), "")
    .replace(new RegExp(`\\s*\\|\\s*${SITE_DOMAIN}\\s*$`, "i"), "")
    .trim();
  return cleaned || title.trim();
}

/**
 * Pair page title without the brand.
 *
 * The layout's title template adds `| Convertek`; including it here produced
 * "Convert PDF to JPG Online Free — Convertek | Convertek" on ~2,500 pages.
 * Callers that build their own <title> (Open Graph, Twitter) append the brand
 * explicitly.
 */
export function conversionPairTitle(fromExt: string, toExt: string): string {
  return `Convert ${fromExt.toUpperCase()} to ${toExt.toUpperCase()} Online Free`;
}

const CATEGORY_NAME: Record<FormatCategory, string> = {
  image: "image",
  video: "video",
  audio: "audio",
  document: "document",
  data: "data",
  archive: "archive",
  ebook: "ebook",
  presentation: "presentation",
  subtitle: "subtitle",
  font: "font",
  other: "file",
};

/**
 * What actually happens to the content — the part that makes two same-category
 * conversions tell a reader something different.
 */
function pairContentNote(from: FormatInfo, to: FormatInfo): string {
  const toUpper = to.ext.toUpperCase();

  if (from.category === to.category) {
    switch (from.category) {
      case "image":
        return `Colour, transparency and resolution are re-encoded for ${toUpper}.`;
      case "data":
        return `Rows, headers and value types are rewritten for ${toUpper}.`;
      case "audio":
        return `Audio is decoded and re-encoded as ${toUpper}, length and channels intact.`;
      case "video":
        return `Frames, bitrate and audio tracks are repacked into the ${toUpper} container.`;
      case "document":
        return `Text, layout and embedded images are carried into the ${toUpper} file.`;
      case "archive":
        return `The files inside are repacked into ${toUpper}, paths intact.`;
      case "subtitle":
        return `Cue timings and line breaks are rewritten in ${toUpper} syntax.`;
      case "ebook":
        return `Chapters, images and reading order carry over into ${toUpper}.`;
      case "presentation":
        return `Slides, notes and embedded media keep their ${toUpper} structure.`;
      case "font":
        return `Glyph outlines and font metrics are re-wrapped as ${toUpper}.`;
      default:
        return `The file's contents are re-wrapped in the ${toUpper} format.`;
    }
  }

  if (from.category === "video" && to.category === "audio") {
    return `The audio track is kept as ${toUpper}; the video frames are dropped.`;
  }
  if (from.category === "document" && to.category === "image") {
    return `Pages are rendered as ${toUpper} images, so text is no longer selectable.`;
  }
  if (from.category === "image" && to.category === "document") {
    return `The picture sits on a paginated ${toUpper} file so it prints and shares cleanly.`;
  }
  if (from.category === "data") {
    return `Values and structure carry over as ${toUpper}; styling is dropped.`;
  }
  if (to.category === "data") {
    return `The contents are parsed and written out as structured ${toUpper} records.`;
  }
  const source = CATEGORY_NAME[from.category];
  return `${source.charAt(0).toUpperCase()}${source.slice(1)} content is decoded and re-encoded as ${CATEGORY_NAME[to.category]}.`;
}

/** Stable per-pair pick so the same URL always renders the same snippet. */
function pick<T>(items: readonly T[], key: string, salt: number): T {
  let hash = salt;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}

function clampDescription(text: string, limit = 158): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd()}\u2026`;
}

/**
 * Unique, format-aware meta description for a conversion pair.
 *
 * Every previously generated description was the same sentence with the two
 * format names swapped, which reads as boilerplate across ~2,500 pages. The
 * leading clause always names both extensions, so no two pairs collide; the
 * rest is derived from the categories and what the conversion really does.
 */
export function conversionPairDescription(from: FormatInfo, to: FormatInfo): string {
  const fromUpper = from.ext.toUpperCase();
  const toUpper = to.ext.toUpperCase();
  const key = `${from.ext}-${to.ext}`;

  const openers = [
    `Free ${fromUpper} to ${toUpper} conversion: ${from.name} in, ${to.name} out, no account needed.`,
    `Convert ${fromUpper} to ${toUpper} online \u2014 ${from.name} files become ${to.name} in seconds.`,
    `${fromUpper} to ${toUpper} in your browser: upload the ${from.name}, download the ${to.name}.`,
    `Turn ${from.name} files into ${to.name} with this free ${fromUpper} to ${toUpper} converter.`,
    `Quick ${fromUpper} to ${toUpper} conversion \u2014 private, watermark-free, no account.`,
  ];

  const closers = [
    ` Files are processed temporarily and deleted.`,
    ` Uploads are capped at 30 MB per file.`,
    ` No sign-up and nothing kept afterwards.`,
  ];

  const opener = pick(openers, key, 7);
  const note = pairContentNote(from, to);
  let description = `${opener} ${note}`;

  // Only add the third sentence when it fits whole — a truncated snippet reads
  // worse than a shorter one.
  const closer = pick(closers, key, 53);
  if (`${description}${closer}`.length <= 155) {
    description += closer;
  }

  return clampDescription(description);
}
