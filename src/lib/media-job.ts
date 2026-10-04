import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { getOptionalDb } from "@/lib/db";

export type MediaJobStatus = "processing" | "done" | "error";

export type MediaJob = {
  id: string;
  status: MediaJobStatus;
  error?: string;
  outPath?: string;
  fileName?: string;
  contentType?: string;
  conversionId?: string | null;
  createdAt: number;
};

const ROOT = path.join(os.tmpdir(), "zconvert-media-jobs");
const TTL_MS = 45 * 60 * 1000;

/**
 * Process-local cache for jobs this dyno is actively encoding.
 *
 * The authoritative record lives in Postgres (`ConvertJob`) whenever a
 * database is reachable, so a poll that lands on a different dyno still finds
 * the job. This Map is only the fast path for the dyno doing the work; when no
 * DB is configured it stays the single source of truth, as before.
 */
const jobs = new Map<string, MediaJob>();

function newId(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function ensureRoot(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
}

/** Max output we are willing to inline in Postgres for a web-dyno job. */
function dbOutputCapBytes(): number {
  const mb = Number(process.env.CONVERT_JOB_MAX_MB || "50");
  if (!Number.isFinite(mb) || mb <= 0) return 50 * 1024 * 1024;
  return Math.min(Math.round(mb * 1024 * 1024), 50 * 1024 * 1024);
}

/** Drop very old jobs (memory + disk + expired DB rows). */
export async function sweepMediaJobs(): Promise<void> {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > TTL_MS) {
      await discardMediaJob(id);
    }
  }
}

export async function createMediaJob(meta: {
  fileName: string;
  contentType: string;
  sourceExt?: string;
  targetExt?: string;
  category?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
}): Promise<MediaJob> {
  await ensureRoot();
  await sweepMediaJobs().catch(() => undefined);
  const id = newId();
  const job: MediaJob = {
    id,
    status: "processing",
    fileName: meta.fileName,
    contentType: meta.contentType,
    createdAt: Date.now(),
  };
  jobs.set(id, job);

  // Persisted as `processing`, never `queued`: the convert worker only claims
  // `queued` rows, so this job stays owned by the web dyno doing the encode
  // while still being visible to polls from any dyno.
  const prisma = getOptionalDb();
  if (prisma) {
    const now = new Date();
    await prisma.convertJob
      .create({
        data: {
          id,
          status: "processing",
          isVideo: true,
          fileName: (meta.fileName || "output.bin").slice(0, 500),
          contentType: meta.contentType || "application/octet-stream",
          sourceExt: meta.sourceExt || "bin",
          targetExt: meta.targetExt || "bin",
          category: meta.category ?? null,
          userId: meta.userId ?? null,
          ipAddress: meta.ipAddress ?? null,
          startedAt: now,
          expiresAt: new Date(now.getTime() + TTL_MS),
        },
      })
      .catch(() => undefined);
  }

  return job;
}

export async function getMediaJob(id: string): Promise<MediaJob | null> {
  const cached = jobs.get(id);
  if (cached && Date.now() - cached.createdAt > TTL_MS) {
    void discardMediaJob(id);
  } else if (cached) {
    return cached;
  }

  // Fall through to Postgres so a poll on another dyno still resolves.
  const prisma = getOptionalDb();
  if (!prisma) return null;
  const row = await prisma.convertJob
    .findUnique({ where: { id } })
    .catch(() => null);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.convertJob
      .delete({ where: { id } })
      .catch(() => undefined);
    return null;
  }
  if (row.status !== "processing" && row.status !== "done" && row.status !== "error") {
    return null;
  }
  return {
    id: row.id,
    status: row.status as MediaJobStatus,
    error: row.error ?? undefined,
    fileName: row.fileName,
    contentType: row.contentType,
    conversionId: row.conversionId ?? null,
    createdAt: row.createdAt.getTime(),
  };
}

export async function markMediaJobDone(
  id: string,
  result: Buffer,
  conversionId: string | null,
): Promise<void> {
  const job = jobs.get(id);
  const prisma = getOptionalDb();

  // Small results go to Postgres so any dyno can serve the download; large
  // video output stays on this dyno's disk, which is the best we can do
  // without external object storage. Without a DB, disk is the only copy.
  const inlineInDb = !!prisma && result.length <= dbOutputCapBytes();
  if (!inlineInDb) {
    await ensureRoot();
    const outPath = path.join(ROOT, `${id}.out`);
    await fs.writeFile(outPath, result);
    if (job) {
      job.outPath = outPath;
    }
  }

  if (job) {
    job.status = "done";
    job.conversionId = conversionId;
    jobs.set(id, job);
  }

  if (prisma) {
    await prisma.convertJob
      .update({
        where: { id },
        data: {
          status: "done",
          outputData: inlineInDb ? new Uint8Array(result) : null,
          inputData: null,
          conversionId,
          finishedAt: new Date(),
          error: null,
        },
      })
      .catch(() => undefined);
  }
}

export async function markMediaJobError(id: string, error: string): Promise<void> {
  const job = jobs.get(id);
  if (job) {
    job.status = "error";
    job.error = error;
    jobs.set(id, job);
  }

  const prisma = getOptionalDb();
  if (prisma) {
    await prisma.convertJob
      .update({
        where: { id },
        data: {
          status: "error",
          error: error.slice(0, 2000),
          inputData: null,
          finishedAt: new Date(),
        },
      })
      .catch(() => undefined);
  }
}

export async function readMediaJobOutput(id: string): Promise<Buffer | null> {
  const job = jobs.get(id);
  if (job?.outPath && job.status === "done") {
    try {
      return await fs.readFile(job.outPath);
    } catch {
      // fall through to the shared copy
    }
  }

  const prisma = getOptionalDb();
  if (!prisma) return null;
  const row = await prisma.convertJob
    .findUnique({
      where: { id },
      select: { status: true, outputData: true, expiresAt: true },
    })
    .catch(() => null);
  if (!row || row.status !== "done" || !row.outputData) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return Buffer.from(row.outputData);
}

export async function discardMediaJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (job?.outPath) {
    await fs.unlink(job.outPath).catch(() => undefined);
  }
  jobs.delete(id);

  const prisma = getOptionalDb();
  if (prisma) {
    await prisma.convertJob.delete({ where: { id } }).catch(() => undefined);
  }
}