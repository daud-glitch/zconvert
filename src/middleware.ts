import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = [
  "/api/convert",
  "/api/convert/image",
  "/api/convert/data",
  "/api/convert/archive",
  "/api/convert/document",
  "/api/convert/other",
  "/api/formats",
  "/api/bookmarks",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/signup",
  "/api/auth/2fa",
  "/api/fetch-url",
  "/api/merge-pdf",
  "/api/pdf-split",
  "/api/ready",
  "/api/health",
  "/login",
  "/",
];

// Routes that require admin role
const adminRoutes = ["/api/admin"];

function corsPreflightResponse(): NextResponse {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    request.method === "OPTIONS" &&
    pathname.startsWith("/api/convert")
  ) {
    return corsPreflightResponse();
  }

  const sessionCookie = request.cookies.get("session");

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    // For public routes, just continue
    return NextResponse.next();
  }

  // Protect admin API routes
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    try {
      const session = JSON.parse(sessionCookie.value);
      if (!session || !session.userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }
      // Allow through - the route handler will verify admin role via requireAdmin
      return NextResponse.next();
    } catch {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 },
      );
    }
  }

  // For all other routes, allow through
  return NextResponse.next();
}

export const config = {
  // Match all API routes except public/auth, for example admin routes
  // Match all UI routes, for example protected /dashboard routes
  // For login route, we redirect to dashboard if user is logged in
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/conversions/:path*",
    "/bookmarks/:path*",
    "/profile/:path*",
    "/login",
  ],
};
