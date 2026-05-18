import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const all = searchParams.get("all") === "true";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;

    // Build the where clause — users only see their own conversions unless admin requests all
    const where: Record<string, unknown> =
      all && auth.user.role === "admin" ? {} : { userId: auth.user.id };
    if (category) where.category = category;
    if (status) where.status = status;

    const [conversions, total] = await Promise.all([
      db.conversion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.conversion.count({ where }),
    ]);

    // Compute global stats (admins see all, users see their own)
    const statsWhere =
      auth.user.role === "admin" ? {} : { userId: auth.user.id };
    const [totalCount, sizeAggregation] = await Promise.all([
      db.conversion.count({ where: statsWhere }),
      db.conversion.aggregate({
        where: statsWhere,
        _sum: { outputSize: true, inputSize: true },
      }),
    ]);

    const totalOutputSize = sizeAggregation._sum.outputSize || BigInt(0);
    const totalInputSize = sizeAggregation._sum.inputSize || BigInt(0);

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
        totalConvertedSize: totalOutputSize.toString(),
        totalOriginalSize: totalInputSize.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
