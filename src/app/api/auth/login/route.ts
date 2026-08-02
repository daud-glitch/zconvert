import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import crypto from "crypto";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = checkRateLimit(`login:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      const response = NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429 },
      );
      Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
        if (v) response.headers.set(k, v);
      });
      return response;
    }

    const { email, password, token, isAdminLogin } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { email } }).catch((err) => {
      console.error("DB Error in login:", err);
      throw new Error("Database connection failed");
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (isAdminLogin && user.role !== "admin") {
      return NextResponse.json(
        { error: "Not authorized as admin" },
        { status: 403 },
      );
    }

    // bcrypt only — no plaintext ADMIN_PASSWORD fallback
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (user.twoFactorEnabled) {
      if (!token) {
        // Do not expose userId — client re-sends email/password with TOTP
        return NextResponse.json({ requires2FA: true });
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: "ascii",
        token,
        window: 1,
      });

      if (verified) {
        return createSession(user, request);
      }
      return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
    }

    return createSession(user, request);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

async function createSession(
  user: { id: string; email: string; name: string | null; role: string },
  request: NextRequest,
) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000); // 7 days

  try {
    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent") || null,
      },
    });
    await db.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => {});
  } catch (err) {
    console.error("Session creation error:", err);
    throw new Error("Failed to create session in database");
  }

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });

  response.cookies.set(
    "session",
    JSON.stringify({
      token,
      userId: user.id,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  );

  return response;
}
