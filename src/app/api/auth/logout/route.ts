import { NextRequest, NextResponse } from "next/server";
import { getOptionalDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const prisma = getOptionalDb();
  const sessionCookie = request.cookies.get("session");

  if (prisma && sessionCookie?.value) {
    try {
      const parsed = JSON.parse(sessionCookie.value) as { token?: string };
      if (parsed.token) {
        await prisma.session.deleteMany({ where: { token: parsed.token } });
      }
    } catch (err) {
      console.error("[auth/logout] Failed to delete session:", err);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  return response;
}
