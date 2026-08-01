import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  formats,
  categoryMeta,
  type FormatCategory,
} from "@/lib/formats";
import { getCategoryCapability } from "@/lib/format-capability";
import { parseStoredJsonArray } from "@/lib/http-json";
import {
  getFormatsCatalogVersion,
  syncFormatsCatalog,
} from "@/lib/sync-formats-catalog";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    let formatCount = await db.format.count();
    if (formatCount === 0) {
      await syncFormatsCatalog(db);
      formatCount = await db.format.count();
    }

    const dbCategories = await db.category.findMany({
      include: {
        formats: { orderBy: { ext: "asc" } },
      },
      orderBy: { order: "asc" },
    });

    const useDb = dbCategories.length > 0 && formatCount > 0;

    const categories = useDb
      ? dbCategories.map((cat) => {
          const key = cat.name as FormatCategory;
          const capability =
            key in categoryMeta
              ? getCategoryCapability(key)
              : {
                  status: "partial" as const,
                  note: "Unknown category capability.",
                };
          const pairCount = cat.formats.reduce(
            (acc, f) => acc + parseStoredJsonArray(f.targetFormats).length,
            0,
          );
          const enabledCount = cat.formats.filter((f) => f.enabled).length;

          return {
            id: cat.id,
            category: cat.name,
            label: cat.label,
            color: cat.bgColor || cat.color,
            formatCount: cat.formats.length,
            enabledCount,
            disabledCount: cat.formats.length - enabledCount,
            pairCount,
            enabled: cat.enabled,
            status: capability.status,
            note: capability.note,
            formats: cat.formats.map((f) => ({
              id: f.id,
              ext: f.ext,
              name: f.name,
              description: f.description,
              enabled: f.enabled,
              targetFormats: parseStoredJsonArray(f.targetFormats),
              mimeTypes: parseStoredJsonArray(f.mimeTypes),
            })),
          };
        })
      : (Object.keys(categoryMeta) as FormatCategory[]).map((key) => {
          const meta = categoryMeta[key];
          const capability = getCategoryCapability(key);
          const categoryFormats = formats.filter((f) => f.category === key);
          const pairCount = categoryFormats.reduce(
            (acc, f) => acc + f.targetFormats.length,
            0,
          );

          return {
            id: null as string | null,
            category: key,
            label: meta.label,
            color: meta.bgColor,
            formatCount: categoryFormats.length,
            enabledCount: categoryFormats.length,
            disabledCount: 0,
            pairCount,
            enabled: true,
            status: capability.status,
            note: capability.note,
            formats: categoryFormats.map((f) => ({
              id: null as string | null,
              ext: f.ext,
              name: f.name,
              description: f.description,
              enabled: true,
              targetFormats: f.targetFormats,
              mimeTypes: f.mimeTypes,
            })),
          };
        });

    const totalFormats = categories.reduce((a, c) => a + c.formatCount, 0);
    const totalPairs = categories.reduce((a, c) => a + c.pairCount, 0);
    const enabledFormats = categories.reduce((a, c) => a + c.enabledCount, 0);
    const functionalCategories = categories.filter(
      (c) => c.status === "functional",
    ).length;
    const partialCategories = categories.filter(
      (c) => c.status === "partial",
    ).length;
    const version = useDb
      ? await getFormatsCatalogVersion(db)
      : `static:${totalFormats}`;

    return NextResponse.json({
      categories,
      totalFormats,
      enabledFormats,
      totalPairs,
      functionalCategories,
      partialCategories,
      version,
      source: useDb ? "database" : "static",
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

    await db.format.updateMany({
      where: { id: { in: ids } },
      data: { enabled },
    });

    const version = await getFormatsCatalogVersion(db);
    return NextResponse.json({
      success: true,
      updated: ids.length,
      version,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
