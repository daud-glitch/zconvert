import { NextRequest, NextResponse } from "next/server";
import { getOptionalDb } from "@/lib/db";

type Ctx = { params: Promise<{ slug: string }> };

/** Public CMS page by slug (enabled only). */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const prisma = getOptionalDb();
  if (!prisma) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  try {
    const page = await prisma.page.findFirst({
      where: { slug, enabled: true },
      select: {
        slug: true,
        title: true,
        content: true,
        seoTitle: true,
        seoDesc: true,
        updatedAt: true,
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...page,
        updatedAt: page.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
