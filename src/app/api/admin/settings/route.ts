import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/admin/settings — Return all app settings
export async function GET() {
  try {
    const settings = await db.appSettings.findMany({
      orderBy: { key: "asc" },
    });

    // Return as a key-value map for convenience
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return NextResponse.json({
      data: settings,
      map,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/admin/settings — Update a setting (body: { key, value })
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: string };

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: key, value" },
        { status: 400 }
      );
    }

    // Upsert the setting
    const setting = await db.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ data: setting });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
