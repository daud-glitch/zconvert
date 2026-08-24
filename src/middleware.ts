import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Public site lives only on this host (users should never stay on apex). */
export const CANONICAL_HOST = "www.convertek.tech";

/** Google-friendly permanent redirect (301). Avoid Next 308 + Refresh headers. */
export function permanentCanonicalRedirect(pathAndQuery: string): NextResponse {
  const location = `https://${CANONICAL_HOST}${pathAndQuery || "/"}`;
  try {
    // Prefer a bare 301 Location response — NextResponse.redirect() uses 308 + Refresh,
    // which Search Console often reports as a "Redirect error" for apex URLs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = NextResponse as any;
    if (typeof Ctor === "function") {
      return new Ctor(null, {
        status: 301,
        headers: {
          Location: location,
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      }) as NextResponse;
    }
  } catch {
    // fall through for unit-test mocks
  }
  return NextResponse.redirect(new URL(location), 301);
}

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
export function shouldForceCanonicalHost(host: string): boolean {
  if (!host || host === CANONICAL_HOST) return false;
  const h = host.split(":")[0].trim().toLowerCase();
  if (h === CANONICAL_HOST) return false;
  if (localDevHosts.has(h)) return false;
  if (h.endsWith(".local") || h.endsWith(".localhost")) return false;
  // Keep Heroku app hostname reachable for platform health checks.
  if (h.endsWith(".herokuapp.com")) return false;

  // Any convertek / legacy cloud domain → force www.convertek.tech
  if (h === "convertek.tech" || h.endsWith(".convertek.tech")) return true;
  if (h === "cloudconveter.tech" || h.endsWith(".cloudconveter.tech")) return true;
  if (h === "cloudconverter.tech" || h.endsWith(".cloudconverter.tech")) return true;

  if (process.env.FORCE_CANONICAL_HOST === "1") {
    return true;
  }

  return false;
}

function isLocalDevHost(host: string): boolean {
  const h = host.split(":")[0].trim().toLowerCase();
  return localDevHosts.has(h) || h.endsWith(".local") || h.endsWith(".localhost");
}

function forwardedProto(request: NextRequest): string {
  // Only trust the proxy header. nextUrl.protocol is often "http" even on
  // TLS (Heroku / local), which would 301-loop or break unit tests.
  const raw = request.headers.get("x-forwarded-proto");
  if (!raw) return "";
  return raw.split(",")[0]?.trim().toLowerCase() || "";
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
   * Host + HTTPS canonicalization for page navigations only.
   * Never redirect /api or OPTIONS — browsers drop/broken-follow upload bodies
   * after redirects and CORS preflight fails (upload stuck on "Uploading").
   * Use a single 301 hop to https://www.convertek.tech (Google Search Console).
   */
  const isApi = pathname.startsWith("/api/") || pathname === "/api";
  const proto = forwardedProto(request);
  const needsHttps =
    proto === "http" && !isLocalDevHost(host) && !host.endsWith(".herokuapp.com");
  const needsHost = shouldForceCanonicalHost(host);

  if (
    !isApi &&
    method !== "OPTIONS" &&
    (method === "GET" || method === "HEAD") &&
    (needsHost || needsHttps)
  ) {
    const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return permanentCanonicalRedirect(path);
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
    /*
     * Run on pages AND ads.txt / robots.txt so apex → www is a clean 301
     * (Next.js config redirects emit 308 + Refresh which GSC flags).
     * Skip Next internals and common static image assets only.
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|map)$).*)",
    "/",
  ],
};
