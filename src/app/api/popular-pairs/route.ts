import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/auth";
import { getOptionalDb } from "@/lib/db";
import { HOMEPAGE_POPULAR_PAIRS } from "@/lib/conversion-pairs";
import { isConversionPairListed } from "@/lib/formats";
import { nonAdminConversionWhere } from "@/lib/analytics-filters";

const LIMIT = 15;

function withRateLimit(
  res: NextResponse,
  rl: ReturnType<typeof checkRateLimit>,
): NextResponse {
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
    if (v) res.headers.set(k, v);
  });
  return res;
}

function dedupeKey(from: string, to: string): string {
  return `${from}:${to}`;
}

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = checkRateLimit(`popular-pairs:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return withRateLimit(
      NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 }),
      rl,
    );
  }

  const fallback = HOMEPAGE_POPULAR_PAIRS.slice(0, LIMIT).map((p) => ({
    from: p.from,
    to: p.to,
    count: null as number | null,
  }));

  try {
    const db = getOptionalDb();
    if (!db) {
      return withRateLimit(
        NextResponse.json({ pairs: fallback, source: "fallback" }),
        rl,
      );
    }

    const groups = await db.conversion.groupBy({
      by: ["originalExt", "targetExt"],
      where: { status: "done", ...nonAdminConversionWhere },
      _count: { _all: true },
    });

    const live = groups
      .map((p) => ({
        from: p.originalExt.toLowerCase(),
        to: p.targetExt.toLowerCase(),
        count: p._count._all,
      }))
      .filter(
        (p) =>
          p.from &&
          p.to &&
          p.from !== p.to &&
          isConversionPairListed(p.from, p.to),
      )
      .sort((a, b) => b.count - a.count);

    const seen = new Set<string>();
    const pairs: { from: string; to: string; count: number | null }[] = [];

    for (const p of live) {
      const key = dedupeKey(p.from, p.to);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ from: p.from, to: p.to, count: p.count });
      if (pairs.length >= LIMIT) break;
    }

    for (const p of HOMEPAGE_POPULAR_PAIRS) {
      if (pairs.length >= LIMIT) break;
      const key = dedupeKey(p.from, p.to);
      if (seen.has(key)) continue;
      if (!isConversionPairListed(p.from, p.to)) continue;
      seen.add(key);
      pairs.push({ from: p.from, to: p.to, count: null });
    }

    return withRateLimit(
      NextResponse.json({
        pairs: pairs.slice(0, LIMIT),
        source: live.length > 0 ? "live" : "fallback",
      }),
      rl,
    );
  } catch {
    return withRateLimit(
      NextResponse.json({ pairs: fallback, source: "fallback" }),
      rl,
    );
  }
}
