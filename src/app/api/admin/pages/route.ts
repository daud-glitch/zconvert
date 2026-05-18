import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminPageSchema, formatZodError } from "@/lib/admin-validation";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ data: pages });
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
    const parsed = adminPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const { slug, title, content, enabled, seoTitle, seoDesc } = parsed.data;

    const existingSlug = await db.page.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json(
        { error: "A page with this slug already exists" },
        { status: 409 },
      );
    }

    const page = await db.page.create({
      data: {
        slug,
        title,
        content,
        enabled: enabled ?? true,
        seoTitle,
        seoDesc,
      },
    });
    return NextResponse.json({ data: page }, { status: 201 });
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
    const { id, slug, ...rest } = await request.json();
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 },
      );
    }

    const existing = await db.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    if (slug && slug !== existing.slug) {
      const slugTaken = await db.page.findUnique({ where: { slug } });
      if (slugTaken) {
        return NextResponse.json(
          { error: "A page with this slug already exists" },
          { status: 409 },
        );
      }
    }

    const data = slug ? { slug, ...rest } : rest;
    const page = await db.page.update({ where: { id }, data });
    return NextResponse.json({ data: page });
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
    await db.page.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
