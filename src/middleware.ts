import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Public site lives only on this host (users should never stay on apex). */
export const CANONICAL_HOST = "www.convertek.tech";

const localDevHosts = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "::1",
]);

/**
 * True when request host is not the sole public hostname.
 * Keeps local dev + Heroku *.herokuapp.com (pre-custom-domain / health checks).
 */
function shouldForceCanonicalHost(host: string): boolean {
  if (!host || host === CANONICAL_HOST) return false;
  const h = host.split(":")[0].trim().toLowerCase();
  if (h === CANONICAL_HOST) return false;
  if (localDevHosts.has(h)) return false;
  if (h.endsWith(".local") || h.endsWith(".localhost")) return false;

  // Any convertek / legacy cloud domain → force www.convertek.tech
  if (h === "convertek.tech" || h.endsWith(".convertek.tech")) return true;
  if (h === "cloudconveter.tech" || h.endsWith(".cloudconveter.tech")) return true;
  if (h === "cloudconverter.tech" || h.endsWith(".cloudconverter.tech")) return true;

  if (
    process.env.FORCE_CANONICAL_HOST === "1" &&
    !h.endsWith(".herokuapp.com")
  ) {
    return true;
  }

  return false;
}

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
  "/api/analytics",
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
  // Real NextResponse supports header init; tests mock .next() only.
  const origin = process.env.ALLOWED_ORIGIN || "*";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = NextResponse as any;
    if (typeof Ctor === "function") {
      return new Ctor(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, X-File-Name, X-Target-Format, X-Quality, X-Width, X-Height, X-Upload-Id, X-Chunk-Index, X-Chunk-Total, X-Total-Size",
          "Access-Control-Max-Age": "86400",
        },
      }) as NextResponse;
    }
  } catch {
    // fall through to next()
  }
  const res = NextResponse.next();
  try {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-File-Name, X-Target-Format, X-Quality, X-Width, X-Height, X-Upload-Id, X-Chunk-Index, X-Chunk-Total, X-Total-Size",
    );
    res.headers.set("Access-Control-Max-Age", "86400");
  } catch {
    // mock Map may be immutable in tests — preflight still reaches handler
  }
  return res;
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

function normalizeHost(raw: string): string {
  // x-forwarded-host may be "a, b" — use first
  const first = raw.split(",")[0]?.trim() || raw.trim();
  return first.toLowerCase().split(":")[0].trim();
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Prefer Host header (Heroku / reverse proxies); fall back to URL hostname.
  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;
  const host = normalizeHost(rawHost);

  /**
   * Host canonicalization is for page navigations only.
   * Never redirect /api or OPTIONS — browsers drop/broken-follow upload bodies
   * after 308 and CORS preflight fails (upload stuck on "Uploading").
   */
  const isApi = pathname.startsWith("/api/") || pathname === "/api";
  if (
    !isApi &&
    method !== "OPTIONS" &&
    (method === "GET" || method === "HEAD") &&
    shouldForceCanonicalHost(host)
  ) {
    const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(
      new URL(`https://${CANONICAL_HOST}${path}`),
      308,
    );
  }

  if (method === "OPTIONS" && pathname.startsWith("/api/convert")) {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|map)$).*)",
  ],
};
