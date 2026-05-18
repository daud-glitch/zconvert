import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminAdSchema, formatZodError } from "@/lib/admin-validation";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const ads = await db.ad.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ data: ads });
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
    const parsed = adminAdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const { title, location, type, content, code, enabled, order } = parsed.data;
    const ad = await db.ad.create({
      data: {
        title,
        location,
        type,
        content,
        code,
        enabled: enabled ?? true,
        order: order ?? 0,
      },
    });
    return NextResponse.json({ data: ad }, { status: 201 });
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
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await db.ad.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const ad = await db.ad.update({ where: { id }, data });
    return NextResponse.json({ data: ad });
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
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.ad.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
