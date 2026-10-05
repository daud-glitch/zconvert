/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  conversionCount,
  conversionGroupBy,
  conversionAggregate,
  conversionFindMany,
  userCount,
  userFindMany,
  pageViewGroupBy,
  pageViewCount,
  queryRaw,
} = vi.hoisted(() => ({
  conversionCount: vi.fn(),
  conversionGroupBy: vi.fn(),
  conversionAggregate: vi.fn(),
  conversionFindMany: vi.fn(),
  userCount: vi.fn(),
  userFindMany: vi.fn(),
  pageViewGroupBy: vi.fn(),
  pageViewCount: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    conversion: {
      count: conversionCount,
      groupBy: conversionGroupBy,
      aggregate: conversionAggregate,
      findMany: conversionFindMany,
    },
    user: { count: userCount, findMany: userFindMany },
    pageView: { groupBy: pageViewGroupBy, count: pageViewCount },
    $queryRaw: queryRaw,
  },
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

import { GET as STATS_GET } from "@/app/api/admin/stats/route";

function req(query = "") {
  return {
    nextUrl: new URL(`http://x/api/admin/stats${query}`),
  } as never;
}

/** The `where` the route passed to the traffic groupBy call. */
function trafficWhere() {
  const call = pageViewGroupBy.mock.calls.at(-1);
  return (call?.[0] as { where: Record<string, unknown> })?.where;
}

function trafficSinceDays(): number | null {
  const createdAt = trafficWhere().createdAt as { gte: Date } | undefined;
  if (!createdAt?.gte) return null;
  return Math.round(
    (Date.now() - createdAt.gte.getTime()) / (24 * 60 * 60 * 1000),
  );
}

describe("admin stats traffic range", () => {
  beforeEach(() => {
    for (const mock of [
      conversionCount,
      conversionGroupBy,
      conversionAggregate,
      conversionFindMany,
      userCount,
      userFindMany,
      pageViewGroupBy,
      pageViewCount,
      queryRaw,
    ]) {
      mock.mockReset();
    }
    conversionCount.mockResolvedValue(10);
    userCount.mockResolvedValue(2);
    userFindMany.mockResolvedValue([]);
    conversionAggregate.mockResolvedValue({
      _sum: { inputSize: 100, outputSize: 40 },
      _avg: { duration: 120 },
    });
    conversionGroupBy.mockResolvedValue([]);
    conversionFindMany.mockResolvedValue([]);
    queryRaw.mockResolvedValue([]);
    pageViewGroupBy.mockResolvedValue([
      { source: "Google", _count: { _all: 30 } },
      { source: null, _count: { _all: 70 } },
    ]);
    pageViewCount.mockResolvedValue(100);
  });

  it("defaults to the last 30 days", async () => {
    const body = await (await STATS_GET(req())).json();
    expect(body.trafficTotals.range).toBe("30d");
    expect(body.trafficTotals.days).toBe(30);
    expect(trafficSinceDays()).toBe(30);
  });

  it("narrows the traffic breakdown to one day", async () => {
    const body = await (await STATS_GET(req("?trafficRange=1d"))).json();
    expect(body.trafficTotals.range).toBe("1d");
    expect(body.trafficTotals.days).toBe(1);
    expect(trafficSinceDays()).toBe(1);
  });

  it("supports seven days", async () => {
    const body = await (await STATS_GET(req("?trafficRange=7d"))).json();
    expect(trafficSinceDays()).toBe(7);
    expect(body.trafficTotals.pageViews).toBe(100);
  });

  it("drops the lower bound for all time", async () => {
    const body = await (await STATS_GET(req("?trafficRange=all"))).json();
    expect(trafficWhere().createdAt).toBeUndefined();
    expect(body.trafficTotals.days).toBeNull();
    expect(body.trafficTotals.range).toBe("all");
  });

  it("ignores an unknown range instead of failing", async () => {
    const body = await (await STATS_GET(req("?trafficRange=42y"))).json();
    expect(body.trafficTotals.range).toBe("30d");
  });

  it("keeps percentages relative to the views in the chosen range", async () => {
    const body = await (await STATS_GET(req("?trafficRange=1d"))).json();
    const google = body.trafficSources.find((s: { source: string }) => s.source === "Google");
    const unknown = body.trafficSources.find((s: { source: string }) => s.source === "Unknown");
    expect(google.percent).toBe(30);
    expect(unknown.percent).toBe(70);
    expect(body.trafficSources[0].source).toBe("Unknown");
  });

  it("still excludes the admin's own page views", async () => {
    userFindMany.mockResolvedValue([{ id: "admin-1" }]);
    await STATS_GET(req("?trafficRange=7d"));
    expect(trafficWhere().OR).toEqual([
      { userId: null },
      { userId: { notIn: ["admin-1"] } },
    ]);
  });
});