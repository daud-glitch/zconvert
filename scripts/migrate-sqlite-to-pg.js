/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SQLite → PostgreSQL Migration Script
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:5432/dbname" node scripts/migrate-sqlite-to-pg.js
 *
 * Requirements:
 *   - better-sqlite3 must be in node_modules  (still present if you haven't run `bun install` after cleanup)
 *   - DATABASE_URL env variable must point to your PostgreSQL database
 *   - Run `prisma migrate deploy` (or `prisma db push`) on your PG database FIRST
 *     so that all tables exist before running this script.
 *
 * What this script does:
 *   1. Reads every table from  db/custom.db  (SQLite)
 *   2. Transforms data types:
 *        - Unix ms timestamps  →  JavaScript Date
 *        - Integer 0/1         →  Boolean
 *        - Missing fields      →  schema defaults
 *   3. Upserts all records into PostgreSQL via Prisma (safe to run multiple times)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require("path");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Unix-ms number or null/undefined to a JS Date (or null). */
function toDate(val) {
  if (val == null) return null;
  // SQLite stores as integer milliseconds
  if (typeof val === "number") return new Date(val);
  // Already a string ISO date (unlikely but safe)
  return new Date(val);
}

/** Convert SQLite BOOLEAN (0/1) to a real JS boolean. */
function toBool(val, defaultVal = true) {
  if (val == null) return defaultVal;
  return Boolean(val);
}

/** Wrap an async migration step with a nice log. */
async function step(label, fn) {
  process.stdout.write(`  • ${label} ... `);
  try {
    const result = await fn();
    const count = typeof result === "number" ? result : "✓";
    console.log(`done (${count})`);
  } catch (err) {
    console.log("FAILED");
    throw err;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("\n❌  DATABASE_URL is not set.");
    console.error(
      '    Run:  DATABASE_URL="postgresql://..." node scripts/migrate-sqlite-to-pg.js\n'
    );
    process.exit(1);
  }

  // Dynamic imports so the script works even when TS paths aren't compiled
  let Database, PrismaClient;
  try {
    Database = require("better-sqlite3");
  } catch {
    console.error(
      "\n❌  better-sqlite3 not found in node_modules.\n" +
        "    Run `bun add better-sqlite3` temporarily, migrate, then remove it.\n"
    );
    process.exit(1);
  }
  try {
    ({ PrismaClient } = require("@prisma/client"));
  } catch {
    console.error(
      "\n❌  @prisma/client not found. Run `bun run db:generate` first.\n"
    );
    process.exit(1);
  }

  const sqliteFile = path.resolve(__dirname, "../db/custom.db");
  const sqlite = new Database(sqliteFile, { readonly: true });

  const prisma = new PrismaClient();
  await prisma.$connect();

  console.log("\n🚀  Starting migration: SQLite → PostgreSQL\n");

  // ── 1. Users ───────────────────────────────────────────────────────────────
  await step("Users", async () => {
    const rows = sqlite.prepare("SELECT * FROM User").all();
    let count = 0;
    for (const r of rows) {
      await prisma.user.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          email: r.email,
          name: r.name ?? null,
          role: r.role ?? "user",
          avatar: r.avatar ?? null,
          passwordHash: r.passwordHash ?? null,
          twoFactorSecret: r.twoFactorSecret ?? null,
          twoFactorEnabled: toBool(r.twoFactorEnabled, false),
          isActive: true,
          lastLoginAt: null,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 2. Conversions ─────────────────────────────────────────────────────────
  await step("Conversions", async () => {
    const rows = sqlite.prepare("SELECT * FROM Conversion").all();
    let count = 0;
    for (const r of rows) {
      await prisma.conversion.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          userId: r.userId ?? null,
          fileName: r.fileName,
          originalExt: r.originalExt,
          targetExt: r.targetExt,
          category: r.category,
          inputSize: r.inputSize ?? 0,
          outputSize: r.outputSize ?? 0,
          status: r.status ?? "completed",
          duration: r.duration ?? null,
          error: r.error ?? null,
          ipAddress: r.ipAddress ?? null,
          createdAt: toDate(r.createdAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 3. AppSettings ─────────────────────────────────────────────────────────
  await step("AppSettings", async () => {
    const rows = sqlite.prepare("SELECT * FROM AppSettings").all();
    let count = 0;
    for (const r of rows) {
      await prisma.appSettings.upsert({
        where: { key: r.key },
        update: { value: r.value },
        create: {
          id: r.id,
          key: r.key,
          value: r.value,
          type: r.type ?? "string",
          category: r.category ?? "general",
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 4. ApiKey ──────────────────────────────────────────────────────────────
  await step("ApiKeys", async () => {
    const rows = sqlite.prepare("SELECT * FROM ApiKey").all();
    let count = 0;
    for (const r of rows) {
      await prisma.apiKey.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          userId: r.userId,
          key: r.key,
          name: r.name,
          isActive: toBool(r.isActive, true),
          lastUsed: toDate(r.lastUsed),
          expiresAt: toDate(r.expiresAt) ?? null,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 5. Bookmark ────────────────────────────────────────────────────────────
  await step("Bookmarks", async () => {
    const rows = sqlite.prepare("SELECT * FROM Bookmark").all();
    let count = 0;
    for (const r of rows) {
      await prisma.bookmark.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          userId: r.userId,
          name: r.name,
          inputExt: r.inputExt,
          outputExt: r.outputExt,
          category: r.category,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 6. Category ────────────────────────────────────────────────────────────
  await step("Categories", async () => {
    const rows = sqlite.prepare("SELECT * FROM Category").all();
    let count = 0;
    for (const r of rows) {
      await prisma.category.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          name: r.name,
          label: r.label,
          color: r.color,
          bgColor: r.bgColor,
          icon: r.icon,
          enabled: toBool(r.enabled, true),
          order: r.order ?? 0,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 7. Format ──────────────────────────────────────────────────────────────
  await step("Formats", async () => {
    const rows = sqlite.prepare("SELECT * FROM Format").all();
    let count = 0;
    for (const r of rows) {
      await prisma.format.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          ext: r.ext,
          name: r.name,
          description: r.description ?? "",
          categoryId: r.categoryId,
          mimeTypes: r.mimeTypes ?? "[]",
          targetFormats: r.targetFormats ?? "[]",
          enabled: toBool(r.enabled, true),
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 8. FeatureCard ─────────────────────────────────────────────────────────
  await step("FeatureCards", async () => {
    const rows = sqlite.prepare("SELECT * FROM FeatureCard").all();
    let count = 0;
    for (const r of rows) {
      await prisma.featureCard.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          title: r.title,
          description: r.description,
          icon: r.icon,
          enabled: toBool(r.enabled, true),
          order: r.order ?? 0,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 9. Link ────────────────────────────────────────────────────────────────
  await step("Links", async () => {
    const rows = sqlite.prepare("SELECT * FROM Link").all();
    let count = 0;
    for (const r of rows) {
      await prisma.link.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          label: r.label,
          url: r.url,
          group: r.group,
          enabled: toBool(r.enabled, true),
          order: r.order ?? 0,
          icon: r.icon ?? null,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 10. Page ───────────────────────────────────────────────────────────────
  await step("Pages", async () => {
    const rows = sqlite.prepare("SELECT * FROM Page").all();
    let count = 0;
    for (const r of rows) {
      await prisma.page.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          slug: r.slug,
          title: r.title,
          content: r.content,
          enabled: toBool(r.enabled, true),
          seoTitle: r.seoTitle ?? null,
          seoDesc: r.seoDesc ?? null,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── 11. Ad ─────────────────────────────────────────────────────────────────
  await step("Ads", async () => {
    const rows = sqlite.prepare("SELECT * FROM Ad").all();
    let count = 0;
    for (const r of rows) {
      await prisma.ad.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          title: r.title,
          location: r.location,
          type: r.type,
          content: r.content ?? null,
          code: r.code ?? null,
          enabled: toBool(r.enabled, true),
          order: r.order ?? 0,
          createdAt: toDate(r.createdAt) ?? new Date(),
          updatedAt: toDate(r.updatedAt) ?? new Date(),
        },
      });
      count++;
    }
    return count;
  });

  // ── Done ───────────────────────────────────────────────────────────────────
  sqlite.close();
  await prisma.$disconnect();

  console.log("\n✅  Migration complete!\n");
  console.log("   Summary of what was migrated:");
  console.log("   - Users, Conversions, AppSettings, ApiKeys");
  console.log("   - Bookmarks, Categories, Formats, FeatureCards");
  console.log("   - Links, Pages, Ads\n");
}

main().catch((err) => {
  console.error("\n❌  Migration failed:", err.message);
  console.error(err);
  process.exit(1);
});
