import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
  try {
    const parsed = JSON.parse(sessionCookie.value);
    token = parsed.token;
  } catch {
    return null;
  }

  if (!token) {
    return null;
  }

  let session;
  try {
    session = await db.session.findUnique({
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

  try {
    if (new Date(session.expiresAt) < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
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

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: entry.resetAt - now,
  };
}

export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetIn / 1000)),
    "Retry-After": result.allowed
      ? undefined
      : String(Math.ceil(result.resetIn / 1000)),
  };
}
