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
): { nextUrl: URL; cookies: { get: (name: string) => { value: string } | undefined } } {
  return {
    nextUrl: new URL(`http://localhost:3000${pathname}`),
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

    it.each(adminRoutes)("should allow access to %s with valid session containing userId", (route) => {
      const validSession = JSON.stringify({ userId: "user-123", email: "admin@test.com", role: "admin" });
      const req = createMockRequest(route, validSession);
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });

    it("should return 401 for admin route with session missing userId", () => {
      const sessionWithoutUserId = JSON.stringify({ email: "admin@test.com" });
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
      const validSession = JSON.stringify({ userId: "user-123", role: "admin" });
      const req = createMockRequest("/api/admin/users/extra/path", validSession);
      const result = middleware(req as never);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toEqual({ type: "next", headers: new Map() });
    });
  });
});
