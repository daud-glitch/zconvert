import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminUserIds,
  nonAdminConversionWhere,
  nonAdminPageViewWhere,
} from "@/lib/analytics-filters";
import {
  parseTrafficRange,
  trafficRangeDays,
  trafficSince,
} from "@/lib/traffic-range";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Traffic Sources alone is range-aware; every other metric keeps its
    // existing window.
    const trafficRange = parseTrafficRange(
      request.nextUrl.searchParams.get("trafficRange"),
    );
    const trafficFrom = trafficSince(trafficRange);
    const adminUserIds = await getAdminUserIds(db);
    const pageViewFilter = nonAdminPageViewWhere(adminUserIds);
    const trafficPageViewWhere = trafficFrom
      ? { ...pageViewFilter, createdAt: { gte: trafficFrom } }
      : pageViewFilter;

    const pvDailyQuery =
      adminUserIds.length > 0
        ? Prisma.sql`
            SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
                   COUNT(*)::int as page_views
            FROM "PageView"
            WHERE "createdAt" >= ${since30d}
              AND ("userId" IS NULL OR "userId" NOT IN (${Prisma.join(adminUserIds)}))
            GROUP BY 1
            ORDER BY 1 ASC
          `
        : Prisma.sql`
            SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
                   COUNT(*)::int as page_views
            FROM "PageView"
            WHERE "createdAt" >= ${since30d}
            GROUP BY 1
            ORDER BY 1 ASC
          `;

    const [
      totalConversions,
      totalUsers,
      sizeAgg,
      durationAgg,
      conversionsByCategoryRaw,
      conversionsByStatusRaw,
      recentConversions,
      pairGroups,
      convDailyRaw,
      pvDailyRaw,
      trafficGroups,
      trafficPageViewCount,
      dbPing,
    ] = await Promise.all([
      db.conversion.count({ where: nonAdminConversionWhere }),
      db.user.count({ where: { role: { not: "admin" } } }),
      db.conversion.aggregate({
        where: nonAdminConversionWhere,
        _sum: { outputSize: true, inputSize: true },
      }),
      db.conversion.aggregate({
        where: { ...nonAdminConversionWhere, duration: { not: null } },
        _avg: { duration: true },
      }),
      db.conversion.groupBy({
        by: ["category"],
        where: nonAdminConversionWhere,
        _count: { _all: true },
        _sum: { inputSize: true, outputSize: true },
      }),
      db.conversion.groupBy({
        by: ["status"],
        where: nonAdminConversionWhere,
        _count: { _all: true },
      }),
      db.conversion.findMany({
        where: nonAdminConversionWhere,
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      db.conversion.groupBy({
        by: ["originalExt", "targetExt"],
        where: nonAdminConversionWhere,
        _count: { _all: true },
      }),
      db.$queryRaw<
        Array<{ day: string; conversions: number; storage: bigint }>
      >`
        SELECT to_char(c."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
               COUNT(*)::int as conversions,
               COALESCE(SUM(c."outputSize"), 0)::bigint as storage
        FROM "Conversion" c
        LEFT JOIN "User" u ON c."userId" = u.id
        WHERE c."createdAt" >= ${since30d}
          AND (c."userId" IS NULL OR u.role IS DISTINCT FROM 'admin')
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      db.$queryRaw<Array<{ day: string; page_views: number }>>(pvDailyQuery),
      db.pageView
        .groupBy({
          by: ["source"],
          where: trafficPageViewWhere,
          _count: { _all: true },
        })
        .catch(
          () => [] as { source: string | null; _count: { _all: number } }[],
        ),
      db.pageView.count({ where: trafficPageViewWhere }).catch(() => 0),
      db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ]);

    const totalInputSize = Number(sizeAgg._sum.inputSize || 0);
    const totalOutputSize = Number(sizeAgg._sum.outputSize || 0);
    const storageSaved = Math.max(0, totalInputSize - totalOutputSize);

    const conversionsByCategory = conversionsByCategoryRaw.map((item) => ({
      category: item.category,
      count: item._count._all,
      size: Number(item._sum.inputSize || 0),
      outputSize: Number(item._sum.outputSize || 0),
    }));

    const conversionsByStatus: Record<string, number> = {};
    conversionsByStatusRaw.forEach((item) => {
      conversionsByStatus[item.status] = item._count._all;
    });

    const popularPairs = pairGroups
      .map((p) => ({
        pair: `${p.originalExt.toUpperCase()} → ${p.targetExt.toUpperCase()}`,
        originalExt: p.originalExt,
        targetExt: p.targetExt,
        count: p._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const pvByDay = new Map(
      pvDailyRaw.map((row) => [row.day, row.page_views]),
    );
    const dailyStats = convDailyRaw.map((row) => ({
      date: row.day,
      conversions: row.conversions,
      users: 0,
      pageViews: pvByDay.get(row.day) ?? 0,
      storageUsed: Number(row.storage),
    }));

    const trafficPageViews =
      typeof trafficPageViewCount === "number" ? trafficPageViewCount : 0;
    const trafficSources = (Array.isArray(trafficGroups) ? trafficGroups : [])
      .map((g) => {
        const count = g._count._all;
        return {
          source: g.source || "Unknown",
          count,
          percent:
            trafficPageViews > 0
              ? Math.round((count / trafficPageViews) * 1000) / 10
              : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const processUptimeSec = Math.floor(process.uptime());

    return NextResponse.json({
      totalConversions,
      totalUsers,
      conversionsByCategory,
      conversionsByStatus,
      recentConversions: recentConversions.map((c) => ({
        id: c.id,
        fileName: c.fileName,
        originalExt: c.originalExt,
        targetExt: c.targetExt,
        category: c.category,
        inputSize: c.inputSize,
        outputSize: c.outputSize,
        status: c.status,
        duration: c.duration,
        error: c.error,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
      storageSaved,
      storageUsed: totalOutputSize,
      avgDurationMs: durationAgg._avg.duration
        ? Math.round(durationAgg._avg.duration)
        : null,
      popularPairs,
      dailyStats,
      trafficSources,
      trafficTotals: {
        pageViews: trafficPageViews,
        uniqueSources: trafficSources.length,
        range: trafficRange,
        days: trafficRangeDays(trafficRange),
      },
      system: {
        apiOnline: true,
        databaseConnected: dbPing,
        processUptimeSec,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
