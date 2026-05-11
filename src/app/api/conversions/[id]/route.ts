import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversion = await db.conversion.findUnique({ where: { id } });

    if (!conversion) {
      return NextResponse.json(
        { error: "Conversion not found" },
        { status: 404 }
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
