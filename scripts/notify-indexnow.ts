/**
 * Submit the full URL set to IndexNow (Bing, Yandex, searxng and others).
 *
 *   npm run indexnow          — report, never fail the process
 *   npm run indexnow -- --strict — exit non-zero on failure
 *
 * Google does not participate in IndexNow; it still relies on the sitemap.
 */
import { getIndexablePairSlugs } from "../src/lib/conversion-pairs";
import { formats } from "../src/lib/formats";
import { SITE_URL } from "../src/lib/seo";

const KEY = process.env.INDEXNOW_KEY?.trim() ?? "";
const STRICT = process.argv.includes("--strict");
const HOST = SITE_URL.replace(/^https?:\/\//, "");

/** IndexNow accepts up to 10,000 URLs per request; our set is far smaller. */
function collectUrls(): string[] {
  const urls = new Set<string>([
    `${SITE_URL}/`,
    `${SITE_URL}/conversions`,
    `${SITE_URL}/about`,
    `${SITE_URL}/contact`,
    `${SITE_URL}/changelog`,
    `${SITE_URL}/privacy`,
    `${SITE_URL}/terms`,
  ]);
  for (const f of formats) urls.add(`${SITE_URL}/conversions/${f.ext}`);
  // Only the curated pairs: the long tail renders `noindex, follow`, so asking
  // Bing to crawl it would just spend crawl budget on pages we hide.
  for (const slug of getIndexablePairSlugs()) urls.add(`${SITE_URL}/${slug}`);
  return [...urls];
}

async function submit(urls: string[]): Promise<void> {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    // Must resolve to a plaintext file containing exactly the key. Served by
    // /api/../.well-known/indexnow/[key]; without it Bing rejects the batch.
    keyLocation: `${SITE_URL}/.well-known/indexnow/${KEY}.txt`,
    urlList: urls,
  });

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`IndexNow responded ${res.status} ${res.statusText} ${detail}`);
  }
  console.log(`  ✓ ${res.status} ${res.statusText} — ${urls.length} URLs accepted`);
}

async function main() {
  if (!KEY) {
    console.warn(
      "INDEXNOW_KEY is not set — skipping. Generate a key (8-128 hex chars),\n" +
        "  set it as a Heroku config var, then redeploy so the key file exists.",
    );
    return;
  }

  const urls = collectUrls();
  console.log(`Notifying IndexNow for ${urls.length} URLs on ${HOST}…`);

  try {
    await submit(urls);
    console.log("IndexNow notification successful.");
  } catch (e) {
    console.error("IndexNow failed:", e instanceof Error ? e.message : e);
    // A failed notification must never fail a deploy unless explicitly asked.
    if (STRICT) process.exitCode = 1;
  }
}

void main();