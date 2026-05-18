import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}