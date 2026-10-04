/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { groupBy, findMany } = vi.hoisted(() => ({
  groupBy: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { conversion: { groupBy, findMany } },
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({
    authorized: true,
    response: new Response(null, { status: 401 }),
  })),
}));

vi.mock("next/server", () => {
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: class {} };
});

import { GET as EXPORT_GET } from "@/app/api/admin/conversions/export/route";

function req(query: string) {
  return { nextUrl: new URL(`http://x/api/admin/conversions/export?${query}`) } as never;
}

describe("failed conversion export", () => {
  beforeEach(() => {
    groupBy.mockReset();
    findMany.mockReset();

    // attempt counts and failure counts, in the order the route calls them
    groupBy
      .mockResolvedValueOnce([
        { originalExt: "mp4", targetExt: "webm", count: 100 },
        { originalExt: "pdf", targetExt: "docx", count: 50 },
        { originalExt: "docx", targetExt: "pdf", count: 8 },
      ])
      .mockResolvedValueOnce([
        { originalExt: "mp4", targetExt: "webm", count: 40 },
        { originalExt: "docx", targetExt: "pdf", count: 5 },
      ]);

    findMany.mockResolvedValue([
      { originalExt: "mp4", targetExt: "webm", error: "container damaged" },
      { originalExt: "mp4", targetExt: "webm", error: "container damaged" },
      { originalExt: "mp4", targetExt: "webm", error: "no such codec" },
      { originalExt: "docx", targetExt: "pdf", error: "unzip failed" },
    ]);
  });

  it("ranks the worst failing pair first and computes the rate", async () => {
    const res = await EXPORT_GET(req("format=json"));
    const body = await res.json();

    expect(body.summary[0].pair).toBe("mp4-to-webm");
    expect(body.summary[0].failures).toBe(40);
    expect(body.summary[0].attempts).toBe(100);
    expect(body.summary[0].failureRate).toBe(40);
  });

  it("surfaces the dominant error rather than just a count", async () => {
    const res = await EXPORT_GET(req("format=json"));
    const body = await res.json();
    const worst = body.summary[0];

    // The twice-seen message wins over the one-off, and it is reported in the
    // same humanized form the UI shows.
    expect(worst.topError).toBe("container damaged");
    expect(worst.topErrorCount).toBe(2);
  });

  it("treats a pair with no recorded attempts as fully failing", async () => {
    groupBy.mockReset();
    groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ originalExt: "rar", targetExt: "zip", count: 3 }]);
    findMany.mockResolvedValue([]);

    const res = await EXPORT_GET(req("format=json"));
    const body = await res.json();
    expect(body.summary[0].failureRate).toBe(100);
  });

  it("emits a CSV with the pair, counts and top error", async () => {
    const res = await EXPORT_GET(req("format=csv"));
    // Response.text() strips a leading BOM per the WHATWG spec, so read the
    // raw bytes first to prove the Excel-friendly marker actually ships.
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);

    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain(
      "convertek-failed-conversions-summary",
    );
    expect(text).toContain("pair,original_ext,target_ext,failures");
    expect(text).toContain("mp4,webm,40,100,40");
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("returns every failed row in detail view", async () => {
    // Detail view calls findMany twice: once for the error tally, once for
    // the rows themselves.
    findMany.mockResolvedValueOnce([]);
    findMany.mockResolvedValueOnce([
      {
        createdAt: new Date("2026-10-04T10:00:00.000Z"),
        originalExt: "mp4",
        targetExt: "webm",
        fileName: "holiday.mp4",
        category: "video",
        inputSize: 1024,
        duration: 500,
        error: "ffmpeg exited with code 1",
      },
      {
        createdAt: new Date("2026-10-04T09:00:00.000Z"),
        originalExt: "rar",
        targetExt: "zip",
        fileName: "bundle.rar",
        category: "archive",
        inputSize: 2048,
        duration: 90,
        error: "unrar exited with code 3",
      },
    ]);

    const res = await EXPORT_GET(req("view=detail&format=json"));
    const body = await res.json();

    expect(body.total).toBe(2);
    expect(body.rows[0].pair).toBe("mp4->webm");
    expect(body.rows[0].fileName).toBe("holiday.mp4");
    expect(body.rows[1].pair).toBe("rar->zip");
  });

  it("caps the day range so a typo cannot scan years of history", async () => {
    await EXPORT_GET(req("format=json&days=99999"));
    const where = groupBy.mock.calls[0][0].where;
    const spanMs = Date.now() - where.createdAt.gte.getTime();
    expect(spanMs).toBeLessThanOrEqual(366 * 24 * 60 * 60 * 1000);
  });
});