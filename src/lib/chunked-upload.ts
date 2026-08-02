import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Chunk staging on local /tmp.
 * Completeness is derived from part files on disk (not only meta.received)
 * so parallel chunk uploads cannot lose indices via meta.json races.
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
  /** Hint only — source of truth is chunk-*.part on disk */
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

async function writeMetaAtomic(dir: string, meta: ChunkMeta): Promise<void> {
  const target = path.join(dir, "meta.json");
  const tmp = path.join(
    dir,
    `meta.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  );
  await fs.writeFile(tmp, JSON.stringify(meta));
  await fs.rename(tmp, target);
}

/** Read which chunk indices exist as complete .part files. */
async function listReceivedFromDisk(dir: string): Promise<number[]> {
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const indices: number[] = [];
  for (const name of names) {
    const m = /^chunk-(\d+)\.part$/.exec(name);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isInteger(n) && n >= 0) indices.push(n);
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

async function writeChunkAtomic(
  dir: string,
  chunkIndex: number,
  data: Buffer,
): Promise<void> {
  const finalPath = path.join(dir, `chunk-${chunkIndex}.part`);
  const tmpPath = path.join(
    dir,
    `chunk-${chunkIndex}.${process.pid}.${Date.now()}.tmp`,
  );
  await fs.writeFile(tmpPath, data);
  await fs.rename(tmpPath, finalPath);
}

/** Persist one chunk; returns how many unique chunks are stored on disk. */
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

  // Always write the part first (race-safe; each chunkIndex has its own file)
  await writeChunkAtomic(dir, chunkIndex, data);

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
    if (!meta.filename && filename) {
      meta.filename = filename.slice(0, 500);
    }
  }

  // Source of truth: filesystem (fixes parallel upload meta races)
  const received = await listReceivedFromDisk(dir);
  meta.received = received;
  await writeMetaAtomic(dir, meta);

  const complete = received.length === chunkTotal;
  return { receivedCount: received.length, complete };
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

  const received = await listReceivedFromDisk(dir);
  const missing: number[] = [];
  for (let i = 0; i < meta.totalChunks; i++) {
    if (!received.includes(i)) missing.push(i);
  }
  if (missing.length > 0) {
    throw new Error(
      `Upload incomplete: received ${received.length}/${meta.totalChunks} chunks` +
        (missing.length <= 12
          ? ` (missing ${missing.join(", ")})`
          : ` (missing ${missing.slice(0, 8).join(", ")}…)`),
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
  const filename = meta.filename || "upload.bin";
  await cleanupUpload(id).catch(() => undefined);
  return { buffer, filename, totalSize: size };
}

export async function cleanupUpload(uploadId: string): Promise<void> {
  const dir = uploadDir(uploadId);
  await fs.rm(dir, { recursive: true, force: true });
}

export const CHUNK_UPLOAD_MAX_BYTES = MAX_CHUNK_BYTES;
