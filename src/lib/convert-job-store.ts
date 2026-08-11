import crypto from "crypto";
import { getOptionalDb } from "@/lib/db";

export type ConvertJobStatus = "queued" | "processing" | "done" | "error";

export type ConvertJobRow = {
  id: string;
  status: ConvertJobStatus;
  isVideo: boolean;
  fileName: string;
  contentType: string;
  sourceExt: string;
  targetExt: string;
  quality: number;
  width: number | null;
  height: number | null;
  category: string | null;
  userId: string | null;
  ipAddress: string | null;
  error: string | null;
  conversionId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  expiresAt: Date;
};

const TTL_MS = 45 * 60 * 1000;

export function isConvertWorkerEnabled(): boolean {
  const v = process.env.CONVERT_USE_WORKER?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Max input size for DB-backed worker jobs (bytes). */
export function convertJobMaxBytes(): number {
  const mb = Number(process.env.CONVERT_JOB_MAX_MB || "20");
  if (!Number.isFinite(mb) || mb <= 0) return 20 * 1024 * 1024;
  return Math.min(Math.round(mb * 1024 * 1024), 50 * 1024 * 1024);
}

export function canEnqueueConvertJob(size: number): boolean {
  return isConvertWorkerEnabled() && size > 0 && size <= convertJobMaxBytes();
}

function newId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function enqueueConvertJob(input: {
  buffer: Buffer;
  isVideo: boolean;
  fileName: string;
  contentType: string;
  sourceExt: string;
  targetExt: string;
  quality: number;
  width: number | null;
  height: number | null;
  category: string | null;
  userId: string | null;
  ipAddress: string | null;
}): Promise<{ id: string } | null> {
  const prisma = getOptionalDb();
  if (!prisma || !canEnqueueConvertJob(input.buffer.length)) return null;

  const id = newId();
  const now = new Date();
  await prisma.convertJob.create({
    data: {
      id,
      status: "queued",
      isVideo: input.isVideo,
      fileName: input.fileName.slice(0, 500),
      contentType: input.contentType || "application/octet-stream",
      sourceExt: input.sourceExt,
      targetExt: input.targetExt,
      quality: input.quality,
      width: input.width,
      height: input.height,
      category: input.category,
      userId: input.userId,
      ipAddress: input.ipAddress,
      inputData: new Uint8Array(input.buffer),
      expiresAt: new Date(now.getTime() + TTL_MS),
    },
  });
  return { id };
}

export async function getConvertJob(
  id: string,
): Promise<ConvertJobRow | null> {
  const prisma = getOptionalDb();
  if (!prisma) return null;
  const row = await prisma.convertJob.findUnique({ where: { id } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.convertJob
      .delete({ where: { id } })
      .catch(() => undefined);
    return null;
  }
  return {
    id: row.id,
    status: row.status as ConvertJobStatus,
    isVideo: row.isVideo,
    fileName: row.fileName,
    contentType: row.contentType,
    sourceExt: row.sourceExt,
    targetExt: row.targetExt,
    quality: row.quality,
    width: row.width,
    height: row.height,
    category: row.category,
    userId: row.userId,
    ipAddress: row.ipAddress,
    error: row.error,
    conversionId: row.conversionId,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    expiresAt: row.expiresAt,
  };
}

export async function readConvertJobOutput(
  id: string,
): Promise<Buffer | null> {
  const prisma = getOptionalDb();
  if (!prisma) return null;
  const row = await prisma.convertJob.findUnique({
    where: { id },
    select: { status: true, outputData: true, expiresAt: true },
  });
  if (!row || row.status !== "done" || !row.outputData) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return Buffer.from(row.outputData);
}

export async function discardConvertJob(id: string): Promise<void> {
  const prisma = getOptionalDb();
  if (!prisma) return;
  await prisma.convertJob.delete({ where: { id } }).catch(() => undefined);
}

/**
 * Atomically claim next queued job (worker). Prefers non-video first.
 */
export async function claimNextConvertJob(): Promise<{
  id: string;
  isVideo: boolean;
  fileName: string;
  contentType: string;
  sourceExt: string;
  targetExt: string;
  quality: number;
  width: number | null;
  height: number | null;
  category: string | null;
  userId: string | null;
  ipAddress: string | null;
  inputData: Buffer;
} | null> {
  const prisma = getOptionalDb();
  if (!prisma) return null;

  // Prefer light jobs, then smaller inputs (short jobs), then oldest
  const claimed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "ConvertJob"
      WHERE status = 'queued' AND "expiresAt" > NOW()
      ORDER BY "isVideo" ASC,
               octet_length("inputData") ASC NULLS LAST,
               "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;

    if (!rows.length) return null;
    const id = rows[0].id;
    const updated = await tx.convertJob.update({
      where: { id },
      data: {
        status: "processing",
        startedAt: new Date(),
      },
    });
    if (!updated.inputData) {
      await tx.convertJob.update({
        where: { id },
        data: {
          status: "error",
          error: "Job input missing",
          finishedAt: new Date(),
        },
      });
      return null;
    }
    return {
      id: updated.id,
      isVideo: updated.isVideo,
      fileName: updated.fileName,
      contentType: updated.contentType,
      sourceExt: updated.sourceExt,
      targetExt: updated.targetExt,
      quality: updated.quality,
      width: updated.width,
      height: updated.height,
      category: updated.category,
      userId: updated.userId,
      ipAddress: updated.ipAddress,
      inputData: Buffer.from(updated.inputData),
    };
  });

  return claimed;
}

export async function completeConvertJob(
  id: string,
  output: Buffer,
  conversionId: string | null,
): Promise<void> {
  const prisma = getOptionalDb();
  if (!prisma) return;
  await prisma.convertJob.update({
    where: { id },
    data: {
      status: "done",
      outputData: new Uint8Array(output),
      inputData: null, // free RAM/disk in Postgres
      conversionId,
      finishedAt: new Date(),
      error: null,
    },
  });
}

export async function failConvertJob(id: string, error: string): Promise<void> {
  const prisma = getOptionalDb();
  if (!prisma) return;
  await prisma.convertJob.update({
    where: { id },
    data: {
      status: "error",
      error: error.slice(0, 2000),
      inputData: null,
      finishedAt: new Date(),
    },
  });
}

export async function countQueuedConvertJobs(): Promise<number> {
  const prisma = getOptionalDb();
  if (!prisma) return 0;
  return prisma.convertJob.count({ where: { status: "queued" } });
}

/** Drop expired rows (worker + web maintenance). */
export async function sweepExpiredConvertJobs(): Promise<number> {
  const prisma = getOptionalDb();
  if (!prisma) return 0;
  const res = await prisma.convertJob.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return res.count;
}
