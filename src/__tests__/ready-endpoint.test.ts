/**
 * @vitest-environment node
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

import { GET } from "@/app/api/ready/route";

const ENV_KEYS = [
  "CONVERT_USE_WORKER",
  "CONVERT_JOB_MAX_MB",
  "CONVERT_MAX_CONCURRENT",
  "CONVERT_MAX_VIDEO",
  "CONVERT_MAX_QUEUE",
  "DATABASE_URL",
] as const;

describe("/api/ready", () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
  });

  it("reports the in-memory job store without degrading", async () => {
    const res = (await GET()) as unknown as {
      status: number;
      body: {
        status: string;
        checks: Record<string, string>;
        advisories: Record<string, unknown>;
      };
    };

    expect(res.body.checks.api).toBe("ok");
    expect(res.body.checks.sharp).toBe("ok");
    expect(res.body.checks.converter).toBe("ok");
    expect(res.body.status).toBe("ok");
    expect(res.status).toBe(200);

    // Worker flag off => process-local store, which must stay advisory only.
    expect(res.body.advisories.jobStore).toMatch(/in-memory/);
    expect(res.body.advisories.slots).toEqual({
      maxLight: 5,
      maxVideo: 1,
      maxQueue: 20,
    });
  });

  it("reports the db-backed store when the worker flag is on", async () => {
    process.env.CONVERT_USE_WORKER = "1";
    process.env.CONVERT_JOB_MAX_MB = "12";

    const res = (await GET()) as unknown as {
      status: number;
      body: { status: string; advisories: Record<string, unknown> };
    };

    expect(res.body.status).toBe("ok");
    expect(res.status).toBe(200);
    expect(res.body.advisories.jobStore).toBe("db");
    expect(res.body.advisories.dbJobMaxMb).toBe(12);
  });
});