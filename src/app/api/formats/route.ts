import { NextRequest, NextResponse } from "next/server";
import {
  formats,
  categoryMeta,
  getCategoryCount,
  getTotalConversions,
  type FormatCategory,
} from "@/lib/formats";
import { checkRateLimit, rateLimitHeaders } from "@/lib/auth";
import { getOptionalDb } from "@/lib/db";
import { parseStoredJsonArray } from "@/lib/http-json";
import {
  getFormatsCatalogVersion,
  syncFormatsCatalog,
} from "@/lib/sync-formats-catalog";

/** Attach rate limit headers to any response. */
function withRateLimit(
  res: NextResponse,
  rl: ReturnType<typeof checkRateLimit>,
): NextResponse {
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
    if (v) res.headers.set(k, v);
  });
  return res;
}

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rl = checkRateLimit(`formats:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return withRateLimit(
        NextResponse.json(
          { error: "Rate limit exceeded. Try again later." },
          { status: 429 },
        ),
        rl,
      );
    }

    let dbCategories: Awaited<
      ReturnType<
        NonNullable<ReturnType<typeof getOptionalDb>>["category"]["findMany"]
      >
    > = [];
    let version = `static:${formats.length}`;
    const prisma = getOptionalDb();

    if (prisma) {
      try {
        const formatCount = await prisma.format.count();
        if (formatCount === 0) {
          await syncFormatsCatalog(prisma);
        }

        dbCategories = await prisma.category.findMany({
          where: { enabled: true },
          include: {
            formats: {
              where: { enabled: true },
              orderBy: { ext: "asc" },
            },
          },
          orderBy: { order: "asc" },
        });
        version = await getFormatsCatalogVersion(prisma);
      } catch (err) {
        console.warn(
          "[api/formats] DB query failed, using static formats:",
          err,
        );
      }
    }

    const grouped: Record<
      string,
      {
        meta: {
          label: string;
          color: string;
          bgColor: string;
          icon: string;
        };
        formats: unknown[];
        count: number;
      }
    > = {};

    let totalFormats = 0;
    let totalConversions = 0;
    const categoryCounts: Record<string, number> = {};

    if (dbCategories.length > 0) {
      dbCategories.forEach((cat) => {
        const mapped = cat.formats.map((f) => {
          const targets = parseStoredJsonArray(f.targetFormats);
          totalConversions += targets.length;
          return {
            ext: f.ext,
            name: f.name,
            description: f.description,
            category: cat.name,
            mimeTypes: parseStoredJsonArray(f.mimeTypes),
            targetFormats: targets,
          };
        });
        grouped[cat.name] = {
          meta: {
            label: cat.label,
            color: cat.color,
            bgColor: cat.bgColor,
            icon: cat.icon,
          },
          formats: mapped,
          count: mapped.length,
        };
        categoryCounts[cat.name] = mapped.length;
        totalFormats += mapped.length;
      });
    } else {
      const staticCounts = getCategoryCount();
      for (const [category, meta] of Object.entries(categoryMeta)) {
        const list = formats.filter((f) => f.category === category);
        grouped[category] = {
          meta,
          formats: list,
          count: staticCounts[category as FormatCategory] ?? list.length,
        };
        categoryCounts[category] = list.length;
      }
      totalFormats = formats.length;
      totalConversions = getTotalConversions();
    }

    const res = NextResponse.json({
      grouped,
      totalFormats,
      totalConversions,
      categoryCounts,
      version,
    });
    res.headers.set("X-Formats-Version", version);
    res.headers.set("Cache-Control", "no-store");
    return withRateLimit(res, rl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const res = NextResponse.json({ error: message }, { status: 500 });

    try {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const rl = checkRateLimit(`formats:${ip}`, 60, 60_000);
      return withRateLimit(res, rl);
    } catch {
      return res;
    }
  }
}
