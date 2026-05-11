import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bookmarks — Return all bookmarks
export async function GET() {
  try {
    const bookmarks = await db.bookmark.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: bookmarks });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/bookmarks — Create a new bookmark
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, inputExt, outputExt, category } = body as {
      name?: string;
      inputExt?: string;
      outputExt?: string;
      category?: string;
    };

    if (!name || !inputExt || !outputExt || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name, inputExt, outputExt, category" },
        { status: 400 }
      );
    }

    // Use a default userId since auth is not required for this demo
    let defaultUser = await db.user.findFirst({ where: { email: "system@local" } });
    if (!defaultUser) {
      defaultUser = await db.user.create({
        data: { email: "system@local", name: "System" },
      });
    }

    const bookmark = await db.bookmark.create({
      data: {
        userId: defaultUser.id,
        name,
        inputExt,
        outputExt,
        category,
      },
    });

    return NextResponse.json({ data: bookmark }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/bookmarks?id=xxx — Delete a bookmark by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query param: id" },
        { status: 400 }
      );
    }

    const bookmark = await db.bookmark.findUnique({ where: { id } });

    if (!bookmark) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    await db.bookmark.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
