import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Advisory-only diagnostics.
 *
 * These never affect readiness: a `note` here describes how this dyno is
 * configured, not whether it can serve traffic. Video jobs fall back to the
 * in-memory `media-job` store when `CONVERT_USE_WORKER` is off, which does not
 * survive a dyno restart or land on the dyno that later polls it.
 */
async function collectAdvisories() {
  const advisories: Record<string, unknown> = {};

  try {
    const { isConvertWorkerEnabled, convertJobMaxBytes } = await import(
      "@/lib/convert-job-store"
    );
    advisories.jobStore = isConvertWorkerEnabled()
      ? "db"
      : "in-memory (video jobs are process-local)";
    advisories.dbJobMaxMb = Math.round(convertJobMaxBytes() / 1024 / 1024);
  } catch (e) {
    advisories.jobStore = e instanceof Error ? e.message : String(e);
  }

  try {
    const { convertSlotLimits, convertQueueDepth } = await import(
      "@/lib/convert-queue"
    );
    advisories.slots = convertSlotLimits();
    advisories.queueDepth = convertQueueDepth();
  } catch (e) {
    advisories.slots = e instanceof Error ? e.message : String(e);
  }

  try {
    const { getOptionalDb } = await import("@/lib/db");
    advisories.database = getOptionalDb() ? "connected" : "unavailable";
  } catch (e) {
    advisories.database = e instanceof Error ? e.message : String(e);
  }

  return advisories;
}

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
  const body: Record<string, unknown> = {
    status: failed.length === 0 ? "ok" : "degraded",
    checks,
  };

  try {
    body.advisories = await collectAdvisories();
  } catch (e) {
    body.advisories = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(body, {
    status: failed.length === 0 ? 200 : 503,
  });
}