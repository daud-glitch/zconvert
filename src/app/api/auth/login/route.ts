import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123!";

export async function POST(request: NextRequest) {
  try {
    const { email, password, token, isAdminLogin } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    
    if (!user) {
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

    // Check password using bcrypt
    let passwordValid = false;
    if (user.passwordHash) {
      // If it looks like a hash (starts with $2), use bcrypt.compare
      if (user.passwordHash.startsWith('$2')) {
        passwordValid = await bcrypt.compare(password, user.passwordHash);
      } else {
        // Fallback for plain text passwords in DB (if any exist from setup)
        passwordValid = user.passwordHash === password;
      }
    } else if (isAdminLogin) {
      // Fallback for default admin password from env
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
          return createSession(user);
        }
        return NextResponse.json(
          { error: "Invalid 2FA code" },
          { status: 401 }
        );
      }
    }

    return createSession(user);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

function createSession(user: any) {
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
      userId: user.id,
      email: user.email,
      role: user.role,
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