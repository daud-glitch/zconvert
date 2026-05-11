import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session");
    
    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }

    const session = JSON.parse(sessionCookie.value);
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete("session");
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
