/**
 * Upsert static formats.ts into Postgres after deploy (Heroku postbuild).
 * Keeps DB catalog aligned with code so new formats work without manual admin sync.
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[sync-formats-catalog] DATABASE_URL not set — skipping.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const { formats, categoryMeta } = require("../src/lib/formats");
    const categoryKeys = Object.keys(categoryMeta);
    const categoryIds = new Map();

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
        },
      });
      categoryIds.set(name, row.id);
    }

    let formatsUpserted = 0;
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
        },
      });
      formatsUpserted++;
    }

    console.log(
      `[sync-formats-catalog] Upserted ${formatsUpserted} formats across ${categoryKeys.length} categories.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[sync-formats-catalog] Failed:", err);
  process.exit(1);
});
