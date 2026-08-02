import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Single public brand host — apex always redirects here. */
const CANONICAL_HOST = "www.cloudconveter.tech";
const APEX_HOSTS = new Set(["cloudconveter.tech"]);

const publicRoutes = [
  "/api/convert",
  "/api/convert/image",
  "/api/convert/data",
  "/api/convert/archive",
  "/api/convert/document",
  "/api/convert/other",
  "/api/convert/chunk",
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
      "Access-Control-Allow-Headers":
        "Content-Type, X-File-Name, X-Target-Format, X-Quality, X-Width, X-Height, X-Upload-Id, X-Chunk-Index, X-Chunk-Total, X-Total-Size",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function hasSessionUser(sessionCookie: { value: string } | undefined): boolean {
  if (!sessionCookie?.value) return false;
  try {
    const session = JSON.parse(sessionCookie.value) as {
      userId?: unknown;
      token?: unknown;
    };
    const userId =
      typeof session?.userId === "string" && session.userId.length >= 1;
    const token =
      typeof session?.token === "string" && session.token.length >= 32;
    return userId && token;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Prefer Host header (Heroku / reverse proxies); fall back to URL hostname.
  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;
  const host = rawHost.toLowerCase().split(":")[0].trim();

  // Apex → www (one canonical address, permanent)
  if (APEX_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

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
  // Run on pages + APIs so apex→www applies site-wide; skip static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|map)$).*)",
  ],
};
