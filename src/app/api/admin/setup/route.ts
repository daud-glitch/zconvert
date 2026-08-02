import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * Bootstrap / reset admin. Requires ADMIN_SETUP_SECRET.
 * After the first admin exists, set ADMIN_SETUP_ALLOW_RESET=1 to promote again.
 */
export async function POST(request: NextRequest) {
  try {
    const setupSecret = process.env.ADMIN_SETUP_SECRET?.trim();
    if (!setupSecret) {
      return NextResponse.json(
        {
          error:
            "Admin setup is disabled. Set ADMIN_SETUP_SECRET in the server environment.",
        },
        { status: 403 },
      );
    }

    const { email, password, secret } = await request.json();

    if (secret !== setupSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const adminCount = await db.user.count({ where: { role: "admin" } });
    const allowReset = process.env.ADMIN_SETUP_ALLOW_RESET === "1";
    if (adminCount > 0 && !allowReset) {
      return NextResponse.json(
        {
          error:
            "An admin already exists. Set ADMIN_SETUP_ALLOW_RESET=1 to promote or reset via this endpoint.",
        },
        { status: 403 },
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });

    if (existingUser) {
      const updated = await db.user.update({
        where: { email },
        data: { role: "admin", passwordHash: await bcrypt.hash(password, 10) },
      });
      return NextResponse.json({
        success: true,
        message: `User ${email} is now admin`,
        user: { id: updated.id, email: updated.email, role: updated.role },
      });
    }

    const user = await db.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name: "Admin",
        role: "admin",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Admin user created: ${email}`,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
