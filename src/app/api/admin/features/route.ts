import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const features = await db.featureCard.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ data: features });
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
    const { title, description, icon, enabled, order } = await request.json();
    if (!title)
      return NextResponse.json({ error: "title required" }, { status: 400 });
    const feature = await db.featureCard.create({
      data: {
        title,
        description: description || "",
        icon: icon || "✨",
        enabled: enabled ?? true,
        order: order ?? 0,
      },
    });
    return NextResponse.json({ data: feature }, { status: 201 });
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
    const feature = await db.featureCard.update({ where: { id }, data });
    return NextResponse.json({ data: feature });
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
    await db.featureCard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
