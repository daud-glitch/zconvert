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
    // Rate limiting: 60 requests per minute per IP
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

    // Try DB categories; fall back to static formats when Prisma is unavailable
    let dbCategories: Awaited<
      ReturnType<NonNullable<ReturnType<typeof getOptionalDb>>["category"]["findMany"]>
    > = [];
    const prisma = getOptionalDb();
    if (prisma) {
      try {
        dbCategories = await prisma.category.findMany({
          where: { enabled: true },
          include: {
            formats: {
              where: { enabled: true },
            },
          },
          orderBy: { order: "asc" },
        });
      } catch (err) {
        console.warn("[api/formats] DB query failed, using static formats:", err);
      }
    }

    const categoryCounts = getCategoryCount();
    const grouped: Record<string, any> = {};

    if (dbCategories.length > 0) {
      // Use database categories and formats
      dbCategories.forEach(cat => {
        grouped[cat.name] = {
          meta: {
            label: cat.label,
            color: cat.color,
            bgColor: cat.bgColor,
            icon: cat.icon,
          },
          formats: cat.formats.map(f => ({
            ext: f.ext,
            name: f.name,
            description: f.description,
            category: cat.name,
            mimeTypes: parseStoredJsonArray(f.mimeTypes),
            targetFormats: parseStoredJsonArray(f.targetFormats),
          })),
          count: cat.formats.length,
        };
      });
    } else {
      // Fallback to hardcoded formats
      for (const [category, meta] of Object.entries(categoryMeta)) {
        grouped[category] = {
          meta,
          formats: formats.filter((f) => f.category === category),
          count: categoryCounts[category as FormatCategory] ?? 0,
        };
      }
    }

    const totalFormats = dbCategories.length > 0 
      ? dbCategories.reduce((acc, cat) => acc + cat.formats.length, 0)
      : formats.length;

    return withRateLimit(
      NextResponse.json({
        grouped,
        totalFormats,
        totalConversions: getTotalConversions(),
        categoryCounts,
      }),
      rl,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const res = NextResponse.json({ error: message }, { status: 500 });
    
    // Attempt to add rate limit headers if ip is available
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                 request.headers.get("x-real-ip") || "unknown";
      const rl = checkRateLimit(`formats:${ip}`, 60, 60_000);
      return withRateLimit(res, rl);
    } catch {
      return res;
    }
  }
}
