import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Chunk staging on local /tmp.
 * Requires a single web dyno (or sticky sessions). Multi-dyno without shared
 * storage will fail assemble with "Upload session not found".
 */
const ROOT = path.join(os.tmpdir(), "zconvert-chunk-uploads");
const MAX_CHUNKS = 512;
const MAX_CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB per chunk
const TTL_MS = 60 * 60 * 1000;

export type ChunkMeta = {
  uploadId: string;
  totalChunks: number;
  totalSize: number;
  filename: string;
  received: number[];
  createdAt: number;
};

function assertSafeUploadId(uploadId: string): string {
  const id = uploadId.trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id)) {
    throw new Error("Invalid upload id");
  }
  return id;
}

function uploadDir(uploadId: string): string {
  return path.join(ROOT, assertSafeUploadId(uploadId));
}

async function readMeta(dir: string): Promise<ChunkMeta | null> {
  try {
    const raw = await fs.readFile(path.join(dir, "meta.json"), "utf8");
    return JSON.parse(raw) as ChunkMeta;
  } catch {
    return null;
  }
}

async function writeMeta(dir: string, meta: ChunkMeta): Promise<void> {
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta));
}

/** Persist one chunk; returns how many unique chunks are stored. */
export async function saveUploadChunk(input: {
  uploadId: string;
  chunkIndex: number;
  chunkTotal: number;
  totalSize: number;
  filename: string;
  data: Buffer;
}): Promise<{ receivedCount: number; complete: boolean }> {
  const uploadId = assertSafeUploadId(input.uploadId);
  const { chunkIndex, chunkTotal, totalSize, filename, data } = input;

  if (
    !Number.isInteger(chunkIndex) ||
    !Number.isInteger(chunkTotal) ||
    chunkIndex < 0 ||
    chunkTotal < 1 ||
    chunkTotal > MAX_CHUNKS ||
    chunkIndex >= chunkTotal
  ) {
    throw new Error("Invalid chunk index/total");
  }
  if (data.length === 0 || data.length > MAX_CHUNK_BYTES) {
    throw new Error(
      `Chunk size must be 1–${Math.round(MAX_CHUNK_BYTES / (1024 * 1024))} MB`,
    );
  }
  if (!Number.isFinite(totalSize) || totalSize <= 0) {
    throw new Error("Invalid total size");
  }

  const dir = uploadDir(uploadId);
  await fs.mkdir(dir, { recursive: true });

  let meta = await readMeta(dir);
  if (!meta) {
    meta = {
      uploadId,
      totalChunks: chunkTotal,
      totalSize,
      filename: filename.slice(0, 500) || "upload.bin",
      received: [],
      createdAt: Date.now(),
    };
  } else {
    if (meta.totalChunks !== chunkTotal || meta.totalSize !== totalSize) {
      throw new Error("Chunk metadata mismatch for this upload id");
    }
  }

  const chunkPath = path.join(dir, `chunk-${chunkIndex}.part`);
  await fs.writeFile(chunkPath, data);

  if (!meta.received.includes(chunkIndex)) {
    meta.received.push(chunkIndex);
    meta.received.sort((a, b) => a - b);
  }
  await writeMeta(dir, meta);

  const complete = meta.received.length === meta.totalChunks;
  return { receivedCount: meta.received.length, complete };
}

/** Assemble all chunks into one buffer and delete the upload dir. */
export async function assembleUpload(
  uploadId: string,
): Promise<{ buffer: Buffer; filename: string; totalSize: number }> {
  const id = assertSafeUploadId(uploadId);
  const dir = uploadDir(id);
  const meta = await readMeta(dir);
  if (!meta) {
    throw new Error(
      "Upload session not found or expired. Large uploads need a single dyno (or sticky sessions). Re-upload the file and retry.",
    );
  }
  if (Date.now() - meta.createdAt > TTL_MS) {
    await cleanupUpload(id).catch(() => undefined);
    throw new Error("Upload session expired. Re-upload the file.");
  }
  if (meta.received.length !== meta.totalChunks) {
    throw new Error(
      `Upload incomplete: received ${meta.received.length}/${meta.totalChunks} chunks`,
    );
  }

  const parts: Buffer[] = [];
  let size = 0;
  for (let i = 0; i < meta.totalChunks; i++) {
    const part = await fs.readFile(path.join(dir, `chunk-${i}.part`));
    parts.push(part);
    size += part.length;
  }

  if (size !== meta.totalSize) {
    await cleanupUpload(id).catch(() => undefined);
    throw new Error(
      `Upload size mismatch: assembled ${size} bytes, expected ${meta.totalSize}`,
    );
  }

  const buffer = Buffer.concat(parts, size);
  const filename = meta.filename;
  await cleanupUpload(id).catch(() => undefined);
  return { buffer, filename, totalSize: size };
}

export async function cleanupUpload(uploadId: string): Promise<void> {
  const dir = uploadDir(uploadId);
  await fs.rm(dir, { recursive: true, force: true });
}

export const CHUNK_UPLOAD_MAX_BYTES = MAX_CHUNK_BYTES;
