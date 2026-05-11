import { NextResponse } from "next/server";
import {
  formats,
  categoryMeta,
  getCategoryCount,
  getTotalConversions,
  type FormatCategory,
} from "@/lib/formats";

export async function GET() {
  try {
    const categoryCounts = getCategoryCount();

    // Group formats by category
    const grouped: Record<string, {
      meta: (typeof categoryMeta)[FormatCategory];
      formats: typeof formats;
      count: number;
    }> = {};

    for (const [category, meta] of Object.entries(categoryMeta)) {
      grouped[category] = {
        meta,
        formats: formats.filter((f) => f.category === category),
        count: categoryCounts[category as FormatCategory] ?? 0,
      };
    }

    return NextResponse.json({
      grouped,
      totalFormats: formats.length,
      totalConversions: getTotalConversions(),
      categoryCounts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
