import { NextRequest, NextResponse } from "next/server";
import { getOptionalDb } from "@/lib/db";
import { isAdminUser } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id || !(await isAdminUser(session.user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getOptionalDb();
  if (!prisma) {
    return NextResponse.json(
      { error: "Database not connected" },
      { status: 500 },
    );
  }

  try {
    const userCount = await prisma.user.count();
    const conversionCount = await prisma.conversionLog.count();
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5, // Last 5 users
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({
      userCount,
      conversionCount,
      recentUsers,
      databaseConnected: true,
    });
  } catch (error) {
    console.error("[api/admin/db-stats] Database query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch database stats" },
      { status: 500 },
    );
  }
}
