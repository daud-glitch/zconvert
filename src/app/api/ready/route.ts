import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight readiness check for Vercel (no heavy imports). */
export async function GET() {
  const checks: Record<string, string> = { api: "ok" };

  try {
    const sharp = (await import("sharp")).default;
    await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    checks.sharp = "ok";
  } catch (e) {
    checks.sharp = e instanceof Error ? e.message : String(e);
  }

  try {
    await import("@/lib/converter");
    checks.converter = "ok";
  } catch (e) {
    checks.converter = e instanceof Error ? e.message : String(e);
  }

  const failed = Object.entries(checks).filter(([, v]) => v !== "ok");
  return NextResponse.json(
    { status: failed.length === 0 ? "ok" : "degraded", checks },
    { status: failed.length === 0 ? 200 : 503 },
  );
}
