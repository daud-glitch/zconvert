import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    // Run all queries in parallel
    const [
      totalConversions,
      totalUsers,
      categoryBreakdown,
      recentConversions,
      storageResult,
    ] = await Promise.all([
      // Total conversions
      db.conversion.count(),

      // Total users
      db.user.count(),

      // Conversions by category (for chart)
      db.conversion.groupBy({
        by: ["category"],
        _count: { category: true },
        _sum: { outputSize: true },
        orderBy: { _count: { category: "desc" } },
      }),

      // Recent 10 conversions
      db.conversion.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Storage saved: sum of (inputSize - outputSize) for completed conversions
      db.conversion.aggregate({
        _sum: {
          inputSize: true,
          outputSize: true,
        },
        where: { status: "completed" },
      }),
    ]);

    // Build chart-friendly data
    const conversionsByCategory: { category: string; count: number; size: number }[] =
      categoryBreakdown.map((item) => ({
        category: item.category,
        count: item._count.category,
        size: item._sum.outputSize ?? 0,
      }));

    // Compute storage saved
    const totalInputSize = storageResult._sum.inputSize ?? 0;
    const totalOutputSize = storageResult._sum.outputSize ?? 0;
    const storageSaved = Math.max(0, totalInputSize - totalOutputSize);

    // Status breakdown
    const statusBreakdown = await db.conversion.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const conversionsByStatus: Record<string, number> = {};
    for (const item of statusBreakdown) {
      conversionsByStatus[item.status] = item._count.status;
    }

    return NextResponse.json({
      totalConversions,
      totalUsers,
      conversionsByCategory,
      conversionsByStatus,
      recentConversions,
      storageSaved,
      storageUsed: totalOutputSize,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
