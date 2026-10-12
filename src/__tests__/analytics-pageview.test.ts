/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/server", () => {
  class MockNextRequest extends Request {
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
    }
    get nextUrl() {
          return new URL(this.url);
    }
  }
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> || {}) },
      });
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

import { POST } from "@/app/api/analytics/pageview/route";

function makeReq(url = "http://test.local/api/analytics/pageview", init?: RequestInit) {
  const { NextRequest } = require("next/server") as typeof import("next/server");
  // Next's RequestInit.signal forbids null; DOM RequestInit allows it.
  const ni = init ? { ...init, signal: init.signal ?? undefined } : undefined;
  return new NextRequest(url, ni as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

describe("/api/analytics/pageview contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports no GET handler, so GET is 405 — never a 404", async () => {
    const mod = await import("@/app/api/analytics/pageview/route");
    expect(Object.keys(mod).sort()).toEqual(["POST", "runtime"]);
    expect(mod).not.toHaveProperty("GET");
    expect(mod).not.toHaveProperty("notFound");
  });

  it("returns 400 for malformed JSON", async () => {
    const req = makeReq("http://test.local/api/analytics/pageview", {
      method: "POST",
      body: "{not json}",
      headers: { "content-type": "application/json" },
    }) as unknown as Parameters<typeof POST>[0];
    const res = (await POST(req)) as Response;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "Invalid JSON" });
  });

  it("returns 200 with ok flag for well-formed JSON", async () => {
    const req = makeReq("http://test.local/api/analytics/pageview", {
      method: "POST",
      body: JSON.stringify({ path: "/" }),
      headers: { "content-type": "application/json" },
    }) as unknown as Parameters<typeof POST>[0];
    const res = (await POST(req)) as Response;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("ok");
    expect(typeof body.ok).toBe("boolean");
  });

  it("accepts body path or falls back to search param", async () => {
    const req = makeReq("http://test.local/api/analytics/pageview?path=/faq", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }) as unknown as Parameters<typeof POST>[0];
    const res = (await POST(req)) as Response;
    expect(res.status).toBe(200);
  });

  it("429s once the same IP passes the per-minute limit", async () => {
    const base = "http://test.local/api/analytics/pageview";
    const make = () =>
      makeReq(base, {
        method: "POST",
        body: JSON.stringify({ path: "/x" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "9.9.9.9",
        },
      }) as unknown as Parameters<typeof POST>[0];

    let last = (await POST(await make())) as Response;
    // Limit is 60/min, so drive past it and assert we flip to 429.
    for (let i = 0; i < 61 && last.status !== 429; i++) {
      last = (await POST(await make())) as Response;
    }
    expect(last.status).toBe(429);
    const body = await last.json();
    expect(body.ok).toBe(false);
  });

  it("respects admin guard: returns ok:false (reason: admin) without logging", async () => {
    vi.spyOn(await import("@/lib/auth"), "getSessionUser").mockResolvedValue({
      id: "admin-1",
      email: "a@b.c",
      name: "A",
      role: "admin",
      avatar: null,
    } as never);
    const req = makeReq("http://test.local/api/analytics/pageview", {
      method: "POST",
      body: JSON.stringify({ path: "/" }),
      headers: { "content-type": "application/json" },
    }) as unknown as Parameters<typeof POST>[0];
    const res = (await POST(req)) as Response;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: false, reason: "admin" });
  });
});