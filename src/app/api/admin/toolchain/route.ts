import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRarToolchainStatus } from "@/lib/external-toolchain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only toolchain report.
 *
 * Exposes filesystem paths, so it is gated like the other admin routes rather
 * than left on the public readiness endpoint.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  return NextResponse.json(getRarToolchainStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
