import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

import { formats, categoryMeta } from "@/lib/formats";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const categories = Object.entries(categoryMeta).map(([key, meta]) => {
      const categoryFormats = formats.filter((f) => f.category === key);
      const pairCount = categoryFormats.reduce(
        (acc, f) => acc + f.targetFormats.length,
        0,
      );

      return {
        category: key,
        label: meta.label,
        color: meta.bgColor,
        formatCount: categoryFormats.length,
        pairCount,
        status: "functional" as const,
      };
    });

    const totalFormats = formats.length;
    const totalPairs = formats.reduce((acc, f) => acc + f.targetFormats.length, 0);

    return NextResponse.json({
      categories,
      totalFormats,
      totalPairs,
      functionalCategories: categories.length,
      partialCategories: 0,
    });
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
    const { ids, enabled } = await request.json();
    if (!ids || !Array.isArray(ids) || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "ids array and enabled boolean required" },
        { status: 400 },
      );
    }

    // Batch update formats enabled status
    await Promise.all(
      ids.map((id: string) =>
        db.format.update({ where: { id }, data: { enabled } }),
      ),
    );

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
