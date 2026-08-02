import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getOptionalDb } from "@/lib/db";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`reset-pw:${ip}`, 10, 15 * 60_000);
  if (!rl.allowed) {
    const response = NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
      if (v) response.headers.set(k, v);
    });
    return response;
  }

  try {
    const { token, password } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters with a letter and a number",
        },
        { status: 400 },
      );
    }

    const prisma = getOptionalDb();
    if (!prisma) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    const tokenHash = hashToken(token);
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !row ||
      row.usedAt ||
      row.expiresAt < new Date() ||
      !row.user?.isActive
    ) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions so old sessions cannot stay logged in
      prisma.session.deleteMany({ where: { userId: row.userId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password updated. You can sign in now.",
    });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
