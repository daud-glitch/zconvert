import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ bookmarks: [] });
    }

    const bookmarks = await db.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, inputExt, outputExt, category } = await request.json();

    if (!inputExt || !outputExt || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bookmark = await db.bookmark.upsert({
      where: {
        userId_inputExt_outputExt: {
          userId: user.id,
          inputExt,
          outputExt,
        },
      },
      update: {
        name: name || `${inputExt.toUpperCase()} to ${outputExt.toUpperCase()}`,
        category,
      },
      create: {
        userId: user.id,
        name: name || `${inputExt.toUpperCase()} to ${outputExt.toUpperCase()}`,
        inputExt,
        outputExt,
        category,
      },
    });

    return NextResponse.json({ success: true, bookmark });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save bookmark" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    await db.bookmark.delete({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
  }
}
