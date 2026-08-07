import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Next.js server modules
vi.mock("next/server", () => {
  const mockNextResponse = {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      headers: new Map(),
    })),
    next: vi.fn(() => ({
      type: "next",
      headers: new Map(),
    })),
    redirect: vi.fn((url: URL, status?: number) => ({
      type: "redirect",
      url: String(url),
      status: status ?? 307,
      headers: new Map(),
    })),
  };

  return {
    NextResponse: mockNextResponse,
    NextRequest: vi.fn(),
  };
});

// Import after mocks
import { NextResponse } from "next/server";

// Helper to create a mock request
function createMockRequest(
  pathname: string,
  sessionCookie?: string,
  host = "localhost:3000",
): {
  nextUrl: URL;
  cookies: { get: (name: string) => { value: string } | undefined };
  headers: { get: (name: string) => string | null };
  method: string;
} {
  const nextUrl = new URL(`http://${host}${pathname}`);
  return {
    nextUrl,
    method: "GET",
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === "host") return host;
        if (name.toLowerCase() === "x-forwarded-host") return null;
        return null;
      },
    },
    cookies: {
      get: (name: string) => {
        if (name === "session" && sessionCookie !== undefined) {
          return { value: sessionCookie };
        }
        return undefined;
      },
    },
  };
}

describe("middleware", () => {
  let middleware: typeof import("../middleware").middleware;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import fresh each test to avoid module state issues
    const mod = await import("../middleware");
    middleware = mod.middleware;
  });

  describe("canonical host redirect", () => {
    it("redirects apex convertek.tech to www", () => {
      const req = createMockRequest("/", undefined, "convertek.tech");
      middleware(req as never);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const url = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as URL;
      expect(url.hostname).toBe("www.convertek.tech");
      expect(url.pathname).toBe("/");
      expect(
        (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][1],
      ).toBe(308);
    });

    it("redirects legacy cloudconveter hosts to www.convertek.tech", () => {
      for (const host of ["cloudconveter.tech", "www.cloudconveter.tech"]) {
        (NextResponse.redirect as ReturnType<typeof vi.fn>).mockClear();
        (NextResponse.next as ReturnType<typeof vi.fn>).mockClear();
        const req = createMockRequest("/", undefined, host);
        middleware(req as never);
        expect(NextResponse.redirect).toHaveBeenCalled();
        const url = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock
          .calls[0][0] as URL;
        expect(url.hostname).toBe("www.convertek.tech");
      }
    });

    it("does not redirect www host", () => {
      const req = createMockRequest("/", undefined, "www.convertek.tech");
      middleware(req as never);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("does not redirect localhost", () => {
      const req = createMockRequest("/", undefined, "localhost:3000");
      middleware(req as never);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe("public routes", () => {
    const publicRoutes = [
      "/",
      "/login",
      "/api/convert",
      "/api/convert/image",
      "/api/formats",
      "/api/formats/list",
      "/api/bookmarks",
      "/api/bookmarks/123",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/auth/me",
      "/api/cms",
      "/api/cms/pages/about",
    ];

    it.each(publicRoutes)("should allow access to %s without session", (route) => {
      const req = createMockRequest(route);
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });

    it("should allow access to public routes even with invalid session", () => {
      const req = createMockRequest("/api/convert", "invalid-json{{{");
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });
  });

  describe("admin routes", () => {
    const adminRoutes = [
      "/api/admin",
      "/api/admin/users",
      "/api/admin/stats",
      "/api/admin/settings",
      "/api/admin/formats",
    ];

    it.each(adminRoutes)("should return 401 for %s without session cookie", (route) => {
      const req = createMockRequest(route);
      middleware(req as never);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 },
      );
    });

    it.each(adminRoutes)("should return 401 for %s with empty session cookie", (route) => {
      const req = createMockRequest(route, "");
      middleware(req as never);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 },
      );
    });

    it.each(adminRoutes)("should return 401 for %s with malformed session cookie", (route) => {
      const req = createMockRequest(route, "not-json-at-all{{{");
      middleware(req as never);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 },
      );
    });

    it.each(adminRoutes)("should allow access to %s with valid session containing userId and token", (route) => {
      const validSession = JSON.stringify({
        userId: "user-123",
        token: "a".repeat(64),
        email: "admin@test.com",
        role: "admin",
      });
      const req = createMockRequest(route, validSession);
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });

    it.each(adminRoutes)("should return 401 for %s with session missing token", (route) => {
      const sessionWithoutToken = JSON.stringify({
        userId: "user-123",
        email: "admin@test.com",
        role: "admin",
      });
      const req = createMockRequest(route, sessionWithoutToken);
      middleware(req as never);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 },
      );
    });

    it("should return 401 for admin route with session missing userId", () => {
      const sessionWithoutUserId = JSON.stringify({
        email: "admin@test.com",
        token: "a".repeat(64),
      });
      const req = createMockRequest("/api/admin", sessionWithoutUserId);
      middleware(req as never);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Authentication required" },
        { status: 401 },
      );
    });
  });

  describe("edge cases", () => {
    it("should allow access to unknown routes without session", () => {
      const req = createMockRequest("/some-unknown-route");
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });

    it("should allow access to static files without session", () => {
      const req = createMockRequest("/favicon.svg");
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });

    it("should handle root path correctly", () => {
      const req = createMockRequest("/");
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });

    it("should handle admin subpaths with valid session", () => {
      const validSession = JSON.stringify({
        userId: "user-123",
        token: "b".repeat(64),
        role: "admin",
      });
      const req = createMockRequest("/api/admin/users/extra/path", validSession);
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });
  });
});
