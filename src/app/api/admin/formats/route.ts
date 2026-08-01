import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getFormatsCatalogVersion } from "@/lib/sync-formats-catalog";

function serializeJsonField(value: unknown, fallback = "[]"): string {
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return fallback;
    }
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  return fallback;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const formats = await db.format.findMany({
      include: { category: true },
      orderBy: { ext: "asc" },
    });
    const version = await getFormatsCatalogVersion(db);
    return NextResponse.json({ data: formats, version });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { ext, name, description, categoryId, mimeTypes, targetFormats, enabled } =
      body;
    if (!ext || !name || !categoryId) {
      return NextResponse.json(
        { error: "ext, name, categoryId required" },
        { status: 400 },
      );
    }
    const format = await db.format.create({
      data: {
        ext: String(ext).toLowerCase().replace(/^\./, ""),
        name,
        description: description || "",
        categoryId,
        mimeTypes: serializeJsonField(mimeTypes),
        targetFormats: serializeJsonField(targetFormats),
        enabled: enabled ?? true,
      },
      include: { category: true },
    });
    const version = await getFormatsCatalogVersion(db);
    return NextResponse.json({ data: format, version }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof rest.name === "string") data.name = rest.name;
    if (typeof rest.description === "string") data.description = rest.description;
    if (typeof rest.categoryId === "string") data.categoryId = rest.categoryId;
    if (typeof rest.enabled === "boolean") data.enabled = rest.enabled;
    if (typeof rest.ext === "string") {
      data.ext = rest.ext.toLowerCase().replace(/^\./, "");
    }
    if (rest.mimeTypes !== undefined) {
      data.mimeTypes = serializeJsonField(rest.mimeTypes);
    }
    if (rest.targetFormats !== undefined) {
      data.targetFormats = serializeJsonField(rest.targetFormats);
    }

    const format = await db.format.update({
      where: { id },
      data,
      include: { category: true },
    });
    const version = await getFormatsCatalogVersion(db);
    return NextResponse.json({ data: format, version });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await db.format.delete({ where: { id } });
    const version = await getFormatsCatalogVersion(db);
    return NextResponse.json({ success: true, version });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
