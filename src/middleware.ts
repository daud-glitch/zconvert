import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  "/api/cms",
  "/login",
  "/",
];

const adminApiRoutes = ["/api/admin"];

/** UI admin entry points that require a session cookie. */
const adminUiRoutes = ["/system/core/admin", "/core/system/admin", "/admin"];

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

function hasSessionUser(sessionCookie: { value: string } | undefined): boolean {
  if (!sessionCookie?.value) return false;
  try {
    const session = JSON.parse(sessionCookie.value);
    return Boolean(session?.userId);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "OPTIONS" && pathname.startsWith("/api/convert")) {
    return corsPreflightResponse();
  }

  const sessionCookie = request.cookies.get("session");

  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    )
  ) {
    return NextResponse.next();
  }

  if (adminApiRoutes.some((route) => pathname.startsWith(route))) {
    // Allow setup bootstrap without a session (still gated by ADMIN_SETUP_SECRET).
    if (pathname === "/api/admin/setup" || pathname.startsWith("/api/admin/setup/")) {
      return NextResponse.next();
    }
    if (!hasSessionUser(sessionCookie)) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (adminUiRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    if (!hasSessionUser(sessionCookie)) {
      const login = new URL("/login", request.url);
      login.searchParams.set("redirect", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/system/core/admin",
    "/system/core/admin/:path*",
    "/core/system/admin",
    "/core/system/admin/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/bookmarks/:path*",
    "/profile/:path*",
    "/login",
  ],
};
