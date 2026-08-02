import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

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
const jobs = new Map<string, MediaJob>();

function newId(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function ensureRoot(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
}

/** Drop very old jobs (memory + disk). */
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
  return job;
}

export function getMediaJob(id: string): MediaJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  if (Date.now() - job.createdAt > TTL_MS) {
    void discardMediaJob(id);
    return null;
  }
  return job;
}

export async function markMediaJobDone(
  id: string,
  result: Buffer,
  conversionId: string | null,
): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;
  await ensureRoot();
  const outPath = path.join(ROOT, `${id}.out`);
  await fs.writeFile(outPath, result);
  job.status = "done";
  job.outPath = outPath;
  job.conversionId = conversionId;
  jobs.set(id, job);
}

export function markMediaJobError(id: string, error: string): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "error";
  job.error = error;
  jobs.set(id, job);
}

export async function readMediaJobOutput(
  id: string,
): Promise<Buffer | null> {
  const job = jobs.get(id);
  if (!job?.outPath || job.status !== "done") return null;
  try {
    return await fs.readFile(job.outPath);
  } catch {
    return null;
  }
}

export async function discardMediaJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (job?.outPath) {
    await fs.unlink(job.outPath).catch(() => undefined);
  }
  jobs.delete(id);
}
