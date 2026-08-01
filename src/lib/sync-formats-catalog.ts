import type { PrismaClient } from "@prisma/client";
import {
  formats,
  categoryMeta,
  type FormatCategory,
} from "@/lib/formats";

export type SyncFormatsResult = {
  categoriesUpserted: number;
  formatsUpserted: number;
  totalFormats: number;
  totalPairs: number;
};

/**
 * Upsert static catalog (`formats.ts`) into DB so admin + public API
 * share one live source of truth. Existing enable flags are preserved
 * unless `resetEnabled` is true.
 */
export async function syncFormatsCatalog(
  prisma: PrismaClient,
  options: { resetEnabled?: boolean } = {},
): Promise<SyncFormatsResult> {
  const { resetEnabled = false } = options;
  const categoryKeys = Object.keys(categoryMeta) as FormatCategory[];
  let categoriesUpserted = 0;
  let formatsUpserted = 0;

  const categoryIds = new Map<string, string>();

  for (let i = 0; i < categoryKeys.length; i++) {
    const name = categoryKeys[i];
    const meta = categoryMeta[name];
    const row = await prisma.category.upsert({
      where: { name },
      create: {
        name,
        label: meta.label,
        color: meta.color,
        bgColor: meta.bgColor,
        icon: meta.icon,
        enabled: true,
        order: i,
      },
      update: {
        label: meta.label,
        color: meta.color,
        bgColor: meta.bgColor,
        icon: meta.icon,
        order: i,
        ...(resetEnabled ? { enabled: true } : {}),
      },
    });
    categoryIds.set(name, row.id);
    categoriesUpserted++;
  }

  for (const fmt of formats) {
    const categoryId = categoryIds.get(fmt.category);
    if (!categoryId) continue;

    await prisma.format.upsert({
      where: { ext: fmt.ext },
      create: {
        ext: fmt.ext,
        name: fmt.name,
        description: fmt.description,
        categoryId,
        mimeTypes: JSON.stringify(fmt.mimeTypes),
        targetFormats: JSON.stringify(fmt.targetFormats),
        enabled: true,
      },
      update: {
        name: fmt.name,
        description: fmt.description,
        categoryId,
        mimeTypes: JSON.stringify(fmt.mimeTypes),
        targetFormats: JSON.stringify(fmt.targetFormats),
        ...(resetEnabled ? { enabled: true } : {}),
      },
    });
    formatsUpserted++;
  }

  const totalPairs = formats.reduce((acc, f) => acc + f.targetFormats.length, 0);

  return {
    categoriesUpserted,
    formatsUpserted,
    totalFormats: formats.length,
    totalPairs,
  };
}

/** Max updatedAt across categories + formats for cache/version busting. */
export async function getFormatsCatalogVersion(
  prisma: PrismaClient,
): Promise<string> {
  const [latestFormat, latestCategory] = await Promise.all([
    prisma.format.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.category.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const formatTs = latestFormat?.updatedAt?.getTime() ?? 0;
  const categoryTs = latestCategory?.updatedAt?.getTime() ?? 0;
  const count = await prisma.format.count();
  return `${Math.max(formatTs, categoryTs)}:${count}`;
}
