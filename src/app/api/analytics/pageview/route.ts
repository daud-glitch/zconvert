import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logPageView } from "@/lib/pageview-log";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (user && user.role === "admin") {
    return NextResponse.json({ ok: false, reason: "admin" });
  }

  const ip = clientIp(request);
  const rl = checkRateLimit(`pageview:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    const res = NextResponse.json({ ok: false }, { status: 429 });
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
      if (v) res.headers.set(k, v);
    });
    return res;
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const path =
    typeof body.path === "string"
      ? body.path
      : request.nextUrl.searchParams.get("path") || "/";

  const recorded = await logPageView({
    path,
    referrer: typeof body.referrer === "string" ? body.referrer : null,
    utmSource: typeof body.utmSource === "string" ? body.utmSource : null,
    utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : null,
    utmCampaign:
      typeof body.utmCampaign === "string" ? body.utmCampaign : null,
    userAgent: request.headers.get("user-agent"),
    userId: user?.id ?? null,
    ipAddress: ip,
  });

  return NextResponse.json({ ok: recorded });
}
