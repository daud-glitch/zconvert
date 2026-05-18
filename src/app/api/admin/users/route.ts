import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { adminUserCreateSchema, adminUserUpdateSchema, VALID_ROLES, formatZodError } from "@/lib/admin-validation";

const VALID_ROLES_SET = new Set<string>(VALID_ROLES);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          twoFactorEnabled: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              conversions: true,
              bookmarks: true,
              apiKeys: true,
            },
          },
        },
      }),
      db.user.count(),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parsed = adminUserCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const { email, name, role, password } = parsed.data;

    if (role === "admin" && auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create admin users" },
        { status: 403 },
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        role: role || "user",
        passwordHash: password ? await bcrypt.hash(password, 10) : null,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query param: id" },
        { status: 400 },
      );
    }

    if (id === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const { id, email, name, role, password, isActive } = parsed.data;

    if (role && !VALID_ROLES_SET.has(role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'user'" },
        { status: 400 },
      );
    }

    if (role === "admin" && auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can assign admin role" },
        { status: 403 },
      );
    }

    if (isActive === false && id === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }

    if (email) {
      const existing = await db.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 },
        );
      }
    }

    const updateData: Record<string, string | boolean> = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
