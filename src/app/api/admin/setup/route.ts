import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Bootstrap / reset admin. Requires ADMIN_SETUP_SECRET.
 * After the first admin exists, set ADMIN_SETUP_ALLOW_RESET=1 to promote again.
 * In production prefer: ADMIN_SETUP_SECRET unset (or remove after first admin).
 */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = checkRateLimit(`admin-setup:${ip}`, 5, 15 * 60_000);
    if (!rl.allowed) {
      const response = NextResponse.json(
        { error: "Too many setup attempts. Try again later." },
        { status: 429 },
      );
      Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
        if (v) response.headers.set(k, v);
      });
      return response;
    }

    if (process.env.ADMIN_SETUP_DISABLED === "1") {
      return NextResponse.json(
        { error: "Admin setup is permanently disabled on this environment." },
        { status: 403 },
      );
    }

    const setupSecret = process.env.ADMIN_SETUP_SECRET?.trim();
    if (!setupSecret || setupSecret.length < 16) {
      return NextResponse.json(
        {
          error:
            "Admin setup is disabled. Set a strong ADMIN_SETUP_SECRET (16+ chars) or create an admin offline.",
        },
        { status: 403 },
      );
    }

    const { email, password, secret } = await request.json();

    if (!secret || !secretsMatch(String(secret), setupSecret)) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(String(email))) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const pw = String(password);
    if (pw.length < 12 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
      return NextResponse.json(
        {
          error:
            "Admin password must be at least 12 characters with a letter and a number",
        },
        { status: 400 },
      );
    }

    const adminCount = await db.user.count({ where: { role: "admin" } });
    const allowReset = process.env.ADMIN_SETUP_ALLOW_RESET === "1";
    if (adminCount > 0 && !allowReset) {
      return NextResponse.json(
        {
          error:
            "An admin already exists. Set ADMIN_SETUP_ALLOW_RESET=1 temporarily to promote or reset via this endpoint, then unset it.",
        },
        { status: 403 },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    if (existingUser) {
      const updated = await db.user.update({
        where: { email: existingUser.email },
        data: {
          role: "admin",
          passwordHash: await bcrypt.hash(pw, 12),
          isActive: true,
        },
      });
      return NextResponse.json({
        success: true,
        message: `User ${updated.email} is now admin`,
        user: { id: updated.id, email: updated.email, role: updated.role },
      });
    }

    const user = await db.user.create({
      data: {
        email: String(email).toLowerCase().trim(),
        passwordHash: await bcrypt.hash(pw, 12),
        name: "Admin",
        role: "admin",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Admin user created: ${user.email}`,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
