import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminLinkSchema, formatZodError } from "@/lib/admin-validation";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const links = await db.link.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ data: links });
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
    const parsed = adminLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const { label, url, group, enabled, order, icon } = parsed.data;
    const link = await db.link.create({
      data: {
        label,
        url,
        group,
        enabled: enabled ?? true,
        order: order ?? 0,
        icon,
      },
    });
    return NextResponse.json({ data: link }, { status: 201 });
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

    const existing = await db.link.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const link = await db.link.update({ where: { id }, data });
    return NextResponse.json({ data: link });
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
    await db.link.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
