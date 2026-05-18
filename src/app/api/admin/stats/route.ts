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
      conversionsByCategoryRaw,
      conversionsByStatusRaw,
      recentConversions,
    ] = await Promise.all([
      db.conversion.count(),
      db.user.count(),
      db.conversion.aggregate({
        _sum: { outputSize: true, inputSize: true },
      }),
      db.conversion.groupBy({
        by: ["category"],
        _count: { _all: true },
        _sum: { inputSize: true },
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
    ]);

    const totalInputSize = Number(sizeAgg._sum.inputSize || 0);
    const totalOutputSize = Number(sizeAgg._sum.outputSize || 0);
    const storageSaved = Math.max(0, totalInputSize - totalOutputSize);

    const conversionsByCategory = conversionsByCategoryRaw.map((item) => ({
      category: item.category,
      count: item._count._all,
      size: Number(item._sum.inputSize || 0),
    }));

    const conversionsByStatus: Record<string, number> = {};
    conversionsByStatusRaw.forEach((item) => {
      conversionsByStatus[item.status] = item._count._all;
    });

    return NextResponse.json({
      totalConversions,
      totalUsers,
      conversionsByCategory,
      conversionsByStatus,
      recentConversions: recentConversions.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      storageSaved,
      storageUsed: totalOutputSize,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
