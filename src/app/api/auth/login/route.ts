import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import speakeasy from "speakeasy";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123!";

export async function POST(request: NextRequest) {
  try {
    const { email, password, token, isAdminLogin, tempToken } =
      await request.json();

    if (isAdminLogin) {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password required" },
          { status: 400 },
        );
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user || user.role !== "admin") {
        return NextResponse.json(
          { error: "Invalid credentials or not an admin" },
          { status: 401 },
        );
      }

      // Check against DB hash or fallback to ADMIN_PASSWORD if no hash exists yet
      let passwordValid = false;
      if (user.passwordHash) {
        // Simple plain-text comparison for now as per current codebase setup
        // Replace with proper hash comparison (e.g. bcrypt) if implemented
        passwordValid = user.passwordHash === password;
      } else {
        passwordValid = password === ADMIN_PASSWORD;
      }

      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 },
        );
      }

      if (user.twoFactorEnabled) {
        if (!token) {
          const response = NextResponse.json({
            requires2FA: true,
            userId: user.id,
          });
          response.cookies.set("temp_token", email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 5,
            path: "/",
          });
          return response;
        } else {
          // Token is provided, verify it
          const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret!,
            encoding: "ascii",
            token,
            window: 1,
          });

          if (verified) {
            const response = createSession(user);
            response.cookies.delete("temp_token");
            return response;
          }
          return NextResponse.json(
            { error: "Invalid 2FA code" },
            { status: 401 },
          );
        }
      }

      return createSession(user);
    }

    // Regular user login
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    return createSession(user);
  } catch (error) {
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
    },
  );

  return response;
}
