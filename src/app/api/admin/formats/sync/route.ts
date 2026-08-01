import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  getFormatsCatalogVersion,
  syncFormatsCatalog,
} from "@/lib/sync-formats-catalog";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const resetEnabled = Boolean(body?.resetEnabled);

    const result = await syncFormatsCatalog(db, { resetEnabled });
    const version = await getFormatsCatalogVersion(db);

    return NextResponse.json({
      success: true,
      ...result,
      version,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
