import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;

    // Build the where clause
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    // Fetch paginated conversions
    const [conversions, total] = await Promise.all([
      db.conversion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.conversion.count({ where }),
    ]);

    // Compute stats
    const [totalCount, sizeAggregation, pairCounts] = await Promise.all([
      db.conversion.count(),
      db.conversion.aggregate({
        _sum: { outputSize: true },
      }),
      db.conversion.groupBy({
        by: ["originalExt", "targetExt"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      }),
    ]);

    const totalOutputSize = sizeAggregation._sum.outputSize || 0;
    const popularPair =
      pairCounts.length > 0
        ? `${pairCounts[0].originalExt.toUpperCase()} to ${pairCounts[0].targetExt.toUpperCase()}`
        : "N/A";

    return NextResponse.json({
      data: conversions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalCount,
        totalConvertedSize: totalOutputSize,
        popularConversion: popularPair,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
