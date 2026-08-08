/**
 * Central SEO / brand copy for Convertek.
 * Use this module for metadata, structured data, and consistent marketing lines.
 */

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

/** Short brand subline (nav / product mark) */
export const BRAND_TAGLINE = "Any file. Any format.";

/**
 * Primary marketing tagline candidates — pick one for campaigns.
 * BRAND_TAGLINE is the live default used in UI + meta where space is tight.
 */
export const TAGLINE_OPTIONS = [
  "Any file. Any format.",
  "Convert anything. Watermark nothing.",
  "One queue. Every format.",
  "Mixed files. Perfect conversion.",
  "Free. Fast. Format-ready.",
  "Drop it. Convert it. Download it.",
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
