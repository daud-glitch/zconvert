import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, currentPassword, newPassword, avatar } = await request.json();

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      avatar?: string;
      email?: string;
      passwordHash?: string;
    } = {};

    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;

    if (email && email !== dbUser.email) {
      // Check if email is taken
      const emailTaken = await db.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
      updateData.email = email;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password required to change password" }, { status: 400 });
      }

      const passwordValid = await bcrypt.compare(currentPassword, dbUser.passwordHash || "");
      if (!passwordValid) {
        return NextResponse.json({ error: "Invalid current password" }, { status: 400 });
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
