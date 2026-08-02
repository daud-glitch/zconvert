import { NextRequest, NextResponse } from "next/server";
import { getOptionalDb } from "@/lib/db";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

export async function getSessionUser(
  request: NextRequest,
): Promise<AuthUser | null> {
  const sessionCookie = request.cookies.get("session");

  if (!sessionCookie) {
    return null;
  }

  let token: string;
  let cookieUserId: string | undefined;
  try {
    const parsed = JSON.parse(sessionCookie.value) as {
      token?: unknown;
      userId?: unknown;
    };
    if (typeof parsed.token !== "string" || parsed.token.length < 32) {
      return null;
    }
    token = parsed.token;
    if (typeof parsed.userId === "string") cookieUserId = parsed.userId;
  } catch {
    return null;
  }

  const prisma = getOptionalDb();
  if (!prisma) {
    return null;
  }

  let session;
  try {
    session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
  } catch (err) {
    console.error("Database error in getSessionUser:", err);
    return null;
  }

  if (!session) {
    return null;
  }

  // Cookie userId must match session (stops forged userId-only cookies)
  if (cookieUserId && cookieUserId !== session.userId) {
    return null;
  }

  try {
    if (new Date(session.expiresAt) < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
  } catch {
    return null;
  }

  const user = session.user;
  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
  };
}

export async function requireAdmin(
  request: NextRequest,
): Promise<
  | { authorized: true; user: AuthUser }
  | { authorized: false; response: NextResponse }
> {
  const user = await getSessionUser(request);

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      ),
    };
  }

  return { authorized: true, user };
}

export async function requireAuth(
  request: NextRequest,
): Promise<
  | { authorized: true; user: AuthUser }
  | { authorized: false; response: NextResponse }
> {
  const user = await getSessionUser(request);

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  return { authorized: true, user };
}

export { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
