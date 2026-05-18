import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const formats = await db.format.findMany({
      include: { category: true },
      orderBy: { ext: "asc" },
    });
    return NextResponse.json({ data: formats });
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
    const { ext, name, description, categoryId, mimeTypes, targetFormats, enabled } = await request.json();
    if (!ext || !name || !categoryId) {
      return NextResponse.json(
        { error: "ext, name, categoryId required" },
        { status: 400 },
      );
    }
    const format = await db.format.create({
      data: {
        ext,
        name,
        description: description || "",
        categoryId,
        mimeTypes: mimeTypes || "[]",
        targetFormats: targetFormats || "[]",
        enabled: enabled ?? true,
      },
    });
    return NextResponse.json({ data: format }, { status: 201 });
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
    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const format = await db.format.update({ where: { id }, data });
    return NextResponse.json({ data: format });
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
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
