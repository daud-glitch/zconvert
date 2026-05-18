import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Conversion ID is required" },
        { status: 400 },
      );
    }

    const conversion = await db.conversion.findUnique({ where: { id } });

    if (!conversion) {
      return NextResponse.json(
        { error: "Conversion not found" },
        { status: 404 },
      );
    }

    // Users can only delete their own conversions; admins can delete any
    if (auth.user.role !== "admin" && conversion.userId !== auth.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this conversion" },
        { status: 403 },
      );
    }

    await db.conversion.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
