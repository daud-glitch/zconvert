import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const VALID_STATUSES = new Set(["new", "read", "resolved"]);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );
    const skip = (page - 1) * limit;
    const status = searchParams.get("status")?.trim() || "";
    const kind = searchParams.get("kind")?.trim() || "";

    const where: { status?: string; kind?: string } = {};
    if (status && VALID_STATUSES.has(status)) where.status = status;
    if (kind) where.kind = kind;

    const [messages, total, newCount] = await Promise.all([
      db.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.contactMessage.count({ where }),
      db.contactMessage.count({ where: { status: "new" } }),
    ]);

    return NextResponse.json({
      data: messages,
      newCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "status must be new, read, or resolved" },
        { status: 400 },
      );
    }

    const existing = await db.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const message = await db.contactMessage.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ data: message });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.contactMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
