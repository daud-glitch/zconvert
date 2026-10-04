/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const dbState: { client: unknown } = { client: null };

vi.mock("@/lib/db", () => ({
  getOptionalDb: () => dbState.client,
}));

import { runDeployPreflight } from "@/lib/deploy-preflight";

const KEYS = [
  "DATABASE_URL",
  "DYNO",
  "CONVERT_USE_WORKER",
  "CONVERT_JOB_MAX_MB",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "NEXT_PUBLIC_SITE_URL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "DISABLE_FFMPEG",
  "DISABLE_RAR",
] as const;

const snapshot: Record<string, string | undefined> = {};

function healthyDb() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ "1": 1 }]),
    convertJob: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

function checkNames(level: "error" | "warn") {
  return (f: { level: string; check: string }) =>
    f.level === level ? f.check : null;
}

function errorChecks(findings: Array<{ level: string; check: string }>) {
  return findings.map(checkNames("error")).filter(Boolean);
}

beforeEach(() => {
  for (const key of KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
  dbState.client = healthyDb();
});

afterEach(() => {
  for (const key of KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

describe("deploy preflight", () => {
  it("fails when the database is not configured", async () => {
    process.env.DATABASE_URL = "";
    const report = await runDeployPreflight();

    expect(report.ok).toBe(false);
    expect(report.findings.map(checkNames("error"))).toContain("database.url");
  });

  it("rejects a non-Postgres database url", async () => {
    process.env.DATABASE_URL = "file:./dev.db";
    const report = await runDeployPreflight();

    expect(report.ok).toBe(false);
    expect(report.findings.map(checkNames("error"))).toContain(
      "database.driver",
    );
  });

  it("fails when Postgres refuses connections", async () => {
    process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:1/db";
    dbState.client = {
      $queryRaw: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      convertJob: { findMany: vi.fn() },
    };

    const report = await runDeployPreflight();
    expect(report.ok).toBe(false);
    expect(report.findings.map(checkNames("error"))).toContain(
      "database.reachable",
    );
  });

  it("fails when the ConvertJob table has not been pushed", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    dbState.client = {
      $queryRaw: vi.fn().mockResolvedValue([{ "1": 1 }]),
      convertJob: {
        findMany: vi.fn().mockRejectedValue(new Error('relation "ConvertJob"')),
      },
    };

    const report = await runDeployPreflight();
    expect(report.ok).toBe(false);
    expect(report.findings.map(checkNames("error"))).toContain(
      "database.schema",
    );
  });

  it("flags a worker dyno running without the worker flag", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    process.env.DYNO = "worker.1";

    const report = await runDeployPreflight();
    expect(report.ok).toBe(false);
    expect(report.findings.map(checkNames("error"))).toContain("worker.flag");
  });

  it("warns when conversions run entirely on the web dyno", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    process.env.DYNO = "web.1";

    const report = await runDeployPreflight();
    expect(report.ok).toBe(true);
    expect(report.findings.map(checkNames("warn"))).toContain("worker.flag");
  });

  it("warns about half-configured secrets without naming values", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    process.env.SMTP_HOST = "smtp.example.com";
    // SMTP_USER and SMTP_PASS deliberately unset.

    const report = await runDeployPreflight();
    const smtp = report.findings.find((f) => f.check === "secrets.smtp");
    expect(smtp?.level).toBe("warn");
    expect(smtp?.message).toContain("SMTP_USER missing");
    expect(smtp?.message).not.toContain("smtp.example.com");
  });

  it("passes a fully configured environment", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    process.env.DYNO = "web.1";
    process.env.CONVERT_USE_WORKER = "true";
    process.env.ADMIN_EMAIL = "a@b.c";
    process.env.ADMIN_PASSWORD = "x";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.convertek.tech";

    const report = await runDeployPreflight();
    expect(errorChecks(report.findings)).toEqual([]);
    expect(report.ok).toBe(true);
  });
});