import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function POST(request: NextRequest) {
  try {
    const { email, password, token, isAdminLogin } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    console.log("Login attempt for:", email);
    const user = await db.user.findUnique({ where: { email } }).catch(err => {
      console.error("DB Error in login:", err);
      throw new Error("Database connection failed");
    });
    
    if (!user) {
      console.log("User not found:", email);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (isAdminLogin && user.role !== "admin") {
      return NextResponse.json(
        { error: "Not authorized as admin" },
        { status: 403 }
      );
    }

    // Check password using bcrypt only
    let passwordValid = false;
    if (user.passwordHash) {
      passwordValid = await bcrypt.compare(password, user.passwordHash);
    } else if (user.email === process.env.ADMIN_EMAIL) {
      // Fallback for default admin password from env ONLY if no hash set and it's the admin user
      passwordValid = password === ADMIN_PASSWORD;
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.twoFactorEnabled) {
      if (!token) {
        const response = NextResponse.json({
          requires2FA: true,
          userId: user.id,
        });
        return response;
      } else {
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret!,
          encoding: "ascii",
          token,
          window: 1,
        });

        if (verified) {
          return createSession(user, request);
        }
        return NextResponse.json(
          { error: "Invalid 2FA code" },
          { status: 401 }
        );
      }
    }

    return createSession(user, request);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

async function createSession(user: { id: string; email: string; name: string | null; role: string }, request: NextRequest) {
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
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});
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
    }
  );

  return response;
}