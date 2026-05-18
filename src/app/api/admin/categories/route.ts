import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminCategorySchema, formatZodError } from "@/lib/admin-validation";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { formats: true },
        },
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ data: categories });
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
    const parsed = adminCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const { name, label, color, bgColor, icon, enabled, order } = parsed.data;

    const existing = await db.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 },
      );
    }

    const category = await db.category.create({
      data: {
        name,
        label,
        color: color || "bg-emerald-500",
        bgColor: bgColor || "bg-emerald-50",
        icon: icon || "Layers",
        enabled: enabled ?? true,
        order: order ?? 0,
      },
    });
    return NextResponse.json({ data: category }, { status: 201 });
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
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const category = await db.category.update({ where: { id }, data });
    return NextResponse.json({ data: category });
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
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
