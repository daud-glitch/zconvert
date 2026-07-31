import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
