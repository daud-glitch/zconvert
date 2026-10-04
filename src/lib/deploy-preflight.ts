/**
 * Deploy preflight: report configuration problems that only become visible
 * after a deploy, when users have already hit them.
 *
 * Pure reporting — this never throws and never changes behaviour, so it is
 * safe to call from the readiness endpoint and from the CLI.
 */

import fs from "fs";
import { getOptionalDb } from "@/lib/db";

export type PreflightLevel = "error" | "warn" | "info";

export type PreflightFinding = {
  level: PreflightLevel;
  check: string;
  message: string;
  hint?: string;
};

export type PreflightReport = {
  /** True when nothing at `error` level was found. */
  ok: boolean;
  dyno: string | null;
  findings: PreflightFinding[];
};

function envFlag(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function resolveBinary(...candidates: Array<string | undefined>): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      fs.accessSync(value, fs.constants.X_OK);
      return value;
    } catch {
      // Not an executable path; keep looking.
    }
  }
  return null;
}

export async function runDeployPreflight(): Promise<PreflightReport> {
  const findings: PreflightFinding[] = [];
  const add = (
    level: PreflightLevel,
    check: string,
    message: string,
    hint?: string,
  ) => findings.push({ level, check, message, hint });

  const dyno = process.env.DYNO ?? null;

  // ── Database ──────────────────────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    add(
      "error",
      "database.url",
      "DATABASE_URL is not set — every DB-backed feature is disabled.",
      "On Heroku the Postgres addon sets this automatically; check the add-on is attached.",
    );
  } else if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    add(
      "error",
      "database.driver",
      `DATABASE_URL does not look like Postgres (${databaseUrl.split(":")[0]}://…).`,
      "ConvertJob, the format catalog and auth all assume Postgres.",
    );
  }

  let dbReachable: boolean | null = null;
  if (databaseUrl) {
    const prisma = getOptionalDb();
    if (!prisma) {
      add(
        "error",
        "database.client",
        "Prisma client could not be created.",
        "Run `npx prisma generate` (heroku-postbuild does this).",
      );
    } else {
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbReachable = true;
      } catch {
        dbReachable = false;
        add(
          "error",
          "database.reachable",
          "Postgres did not accept a connection.",
          "Verify the add-on is running and the connection limit fits web + worker.",
        );
      }
      if (dbReachable) {
        try {
          await prisma.convertJob.findMany({ take: 1, select: { id: true } });
        } catch {
          add(
            "error",
            "database.schema",
            "The ConvertJob table is missing.",
            "Run `npx prisma db push` — video job results are stored there.",
          );
        }
      }
    }
  }
  if (dbReachable === true) {
    add("info", "database.url", "Postgres reachable.");
  }

  // ── Convert worker wiring ─────────────────────────────────────────────────
  const workerEnabled = envFlag("CONVERT_USE_WORKER");
  if (dyno?.startsWith("worker") && !workerEnabled) {
    add(
      "error",
      "worker.flag",
      "This is the worker dyno but CONVERT_USE_WORKER is not enabled.",
      "The worker will poll forever without processing anything.",
    );
  }
  if (workerEnabled && dbReachable === false) {
    add(
      "error",
      "worker.database",
      "CONVERT_USE_WORKER is on but Postgres is unreachable — jobs cannot be queued.",
    );
  }
  if (!workerEnabled) {
    add(
      "warn",
      "worker.flag",
      "CONVERT_USE_WORKER is off: every conversion runs on the web dyno.",
      "Video encodes block a web dyno and cost more dyno minutes than a worker.",
    );
  }

  const jobMaxMb = Number(process.env.CONVERT_JOB_MAX_MB || "20");
  if (Number.isFinite(jobMaxMb) && jobMaxMb > 50) {
    add(
      "warn",
      "worker.job-size",
      `CONVERT_JOB_MAX_MB=${jobMaxMb} is above the 50 MB clamp and will be capped.`,
    );
  }

  // ── Media toolchain ───────────────────────────────────────────────────────
  if (!envFlag("DISABLE_FFMPEG")) {
    const ffmpeg = resolveBinary(
      process.env.FFMPEG_BIN,
      process.env.FFMPEG_PATH,
      "ffmpeg",
    );
    if (ffmpeg) {
      add("info", "media.ffmpeg", `ffmpeg available at ${ffmpeg}.`);
    } else if (workerEnabled) {
      add(
        "warn",
        "media.ffmpeg",
        "No ffmpeg binary found on this dyno.",
        "Run `npm run ensure-ffmpeg` before starting the process.",
      );
    } else {
      add(
        "warn",
        "media.ffmpeg",
        "No ffmpeg binary found — video conversions will fail at runtime.",
      );
    }
  }

  if (!envFlag("DISABLE_RAR")) {
    const rar = resolveBinary(process.env.RAR_BIN, process.env.UNRAR_BIN, "unrar");
    if (rar) {
      add("info", "media.rar", `unrar available at ${rar}.`);
    } else {
      add(
        "warn",
        "media.rar",
        "No unrar binary found — RAR extraction will fail at runtime.",
      );
    }
  }

  // ── Admin access ──────────────────────────────────────────────────────────
  if (!process.env.ADMIN_EMAIL?.trim() || !process.env.ADMIN_PASSWORD?.trim()) {
    add(
      "warn",
      "admin.credentials",
      "ADMIN_EMAIL / ADMIN_PASSWORD are not both set — the admin panel cannot be logged into.",
    );
  }

  // ── Public identity ───────────────────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    add(
      "warn",
      "site.url",
      "NEXT_PUBLIC_SITE_URL is not set — canonical URLs and sitemaps may use a fallback host.",
    );
  } else if (!/^https:\/\//i.test(siteUrl)) {
    add(
      "warn",
      "site.url",
      `NEXT_PUBLIC_SITE_URL is not https (${siteUrl}).`,
      "Canonical tags and the sitemap should point at the https host.",
    );
  }

  // ── Third-party secrets set halfway ───────────────────────────────────────
  const halfConfigured: Array<[string, string, string]> = [
    ["SMTP_HOST", "SMTP_USER", "smtp"],
    ["SMTP_HOST", "SMTP_PASS", "smtp"],
    ["TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "turnstile"],
    [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "google-auth",
    ],
  ];
  for (const [a, b, name] of halfConfigured) {
    const hasA = !!process.env[a]?.trim();
    const hasB = !!process.env[b]?.trim();
    if (hasA !== hasB) {
      add(
        "warn",
        `secrets.${name}`,
        `${name} is half configured (${a} ${hasA ? "set" : "missing"}, ${b} ${hasB ? "set" : "missing"}).`,
      );
    }
  }

  const errors = findings.filter((f) => f.level === "error");
  return { ok: errors.length === 0, dyno, findings };
}