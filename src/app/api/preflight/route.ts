import { NextRequest, NextResponse } from "next/server";
import { runDeployPreflight } from "@/lib/deploy-preflight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deploy preflight over HTTP.
 *
 * Gated by PREFLIGHT_TOKEN: the report names which secrets are set and where
 * binaries live, which is useful for debugging a dyno but not something to
 * publish. Without the token configured this endpoint reports itself missing
 * rather than falling open.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.PREFLIGHT_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Preflight HTTP access is disabled. Set PREFLIGHT_TOKEN to enable it, or run `npm run preflight` on the dyno.",
      },
      { status: 404 },
    );
  }

  const token = request.nextUrl.searchParams.get("token") ?? "";
  const ok =
    token.length === expected.length &&
    token.length > 0 &&
    // Constant-time-ish compare; no secret is exposed either way.
    (() => {
      let diff = 0;
      for (let i = 0; i < token.length; i++) {
        diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
      }
      return diff === 0;
    })();

  if (!ok) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const report = await runDeployPreflight();
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}