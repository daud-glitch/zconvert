import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * Admin-only listing of DB conversion aggregates.
 * Per-user history + files live in browser IndexedDB — not here.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    // Regular users: history is local-only
    if (!(all && auth.user.role === "admin")) {
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
        stats: {
          total: 0,
          totalConvertedSize: "0",
          totalOriginalSize: "0",
        },
        localOnly: true,
        message:
          "Your conversion history is stored in your browser IndexedDB, not on the server.",
      });
    }

    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const [conversions, total, sizeAggregation] = await Promise.all([
      db.conversion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.conversion.count({ where }),
      db.conversion.aggregate({
        where,
        _sum: { outputSize: true, inputSize: true },
      }),
    ]);

    const totalOutputSize = sizeAggregation._sum.outputSize || 0;
    const totalInputSize = sizeAggregation._sum.inputSize || 0;

    return NextResponse.json({
      data: conversions.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        totalConvertedSize: String(totalOutputSize),
        totalOriginalSize: String(totalInputSize),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
