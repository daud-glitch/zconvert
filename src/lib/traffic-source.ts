/**
 * Classify traffic origin for admin analytics (referrer + UTM).
 */

const SITE_HOSTS = new Set(
  [
    "localhost",
    "127.0.0.1",
    "cloudconveter.tech",
    "www.cloudconveter.tech",
    "thawing-chamber-85072-80160349ba84.herokuapp.com",
    process.env.NEXT_PUBLIC_SITE_URL
      ? (() => {
          try {
            return new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
              .replace(/^www\./, "")
              .toLowerCase();
          } catch {
            return "";
          }
        })()
      : "",
  ]
    .filter(Boolean)
    .map((h) => h.replace(/^www\./, "").toLowerCase()),
);

function hostMatches(host: string, needles: string[]): boolean {
  return needles.some((n) => host === n || host.endsWith(`.${n}`));
}

/**
 * Human-readable source label for dashboards.
 * Priority: UTM source → known search/social → referrer host → Direct.
 */
export function resolveTrafficSource(input: {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}): string {
  const utm = (input.utmSource || "").trim().toLowerCase().slice(0, 64);
  if (utm) {
    const medium = (input.utmMedium || "").trim().toLowerCase().slice(0, 32);
    if (medium) return `${utm} / ${medium}`.slice(0, 80);
    return utm;
  }

  const raw = (input.referrer || "").trim();
  if (!raw) return "Direct";

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (!host) return "Direct";

    const siteKey = host.replace(/^www\./, "");
    if (
      SITE_HOSTS.has(siteKey) ||
      SITE_HOSTS.has(host) ||
      host.includes("cloudconveter") ||
      host.includes("herokuapp.com")
    ) {
      return "Internal";
    }

    if (hostMatches(host, ["google.com", "google.co", "googlesyndication.com"])) {
      return "Google";
    }
    if (hostMatches(host, ["bing.com", "bing.net"])) return "Bing";
    if (hostMatches(host, ["yahoo.com", "search.yahoo.com"])) return "Yahoo";
    if (hostMatches(host, ["duckduckgo.com"])) return "DuckDuckGo";
    if (hostMatches(host, ["facebook.com", "fb.com", "m.facebook.com", "l.facebook.com"])) {
      return "Facebook";
    }
    if (hostMatches(host, ["instagram.com", "l.instagram.com"])) return "Instagram";
    if (hostMatches(host, ["twitter.com", "x.com", "t.co"])) return "X / Twitter";
    if (hostMatches(host, ["linkedin.com", "lnkd.in"])) return "LinkedIn";
    if (hostMatches(host, ["youtube.com", "youtu.be"])) return "YouTube";
    if (hostMatches(host, ["reddit.com", "redd.it"])) return "Reddit";
    if (hostMatches(host, ["tiktok.com"])) return "TikTok";
    if (hostMatches(host, ["pinterest.com", "pin.it"])) return "Pinterest";
    if (hostMatches(host, ["whatsapp.com", "wa.me"])) return "WhatsApp";
    if (hostMatches(host, ["telegram.org", "t.me"])) return "Telegram";
    if (hostMatches(host, ["baidu.com"])) return "Baidu";
    if (hostMatches(host, ["yandex.ru", "yandex.com"])) return "Yandex";

    return host.slice(0, 80);
  } catch {
    return "Other";
  }
}

export function sanitizePath(path: string | null | undefined): string {
  const raw = String(path || "/").trim() || "/";
  // Drop hashes; cap length; no protocol-relative junk
  if (!raw.startsWith("/")) return "/";
  return raw.slice(0, 500);
}
