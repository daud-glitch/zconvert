import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const [
      totalConversions,
      totalUsers,
      sizeAgg,
      durationAgg,
      conversionsByCategoryRaw,
      conversionsByStatusRaw,
      recentConversions,
      pairGroups,
      dailyStats,
      trafficGroups,
      totalPageViews30d,
      dbPing,
    ] = await Promise.all([
      db.conversion.count(),
      db.user.count(),
      db.conversion.aggregate({
        _sum: { outputSize: true, inputSize: true },
      }),
      db.conversion.aggregate({
        where: { duration: { not: null } },
        _avg: { duration: true },
      }),
      db.conversion.groupBy({
        by: ["category"],
        _count: { _all: true },
        _sum: { inputSize: true, outputSize: true },
      }),
      db.conversion.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      db.conversion.findMany({
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
        _count: { _all: true },
      }),
      db.dailyStats.findMany({
        orderBy: { date: "desc" },
        take: 30,
      }),
      db.pageView.groupBy({
        by: ["source"],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: { _all: true },
      }).catch(() => [] as { source: string | null; _count: { _all: number } }[]),
      db.pageView.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }).catch(() => 0),
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

    const pageViewTotal30d =
      typeof totalPageViews30d === "number" ? totalPageViews30d : 0;
    const trafficSources = (Array.isArray(trafficGroups) ? trafficGroups : [])
      .map((g) => {
        const count = g._count._all;
        return {
          source: g.source || "Unknown",
          count,
          percent:
            pageViewTotal30d > 0
              ? Math.round((count / pageViewTotal30d) * 1000) / 10
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
      dailyStats: dailyStats
        .map((d) => ({
          date: d.date.toISOString().slice(0, 10),
          conversions: d.conversions,
          users: d.users,
          pageViews: d.pageViews,
          storageUsed: Number(d.storageUsed),
        }))
        .reverse(),
      trafficSources,
      trafficTotals: {
        pageViews: pageViewTotal30d,
        uniqueSources: trafficSources.length,
        days: 30,
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
