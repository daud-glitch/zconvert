/** Client helpers for reliable large media uploads (chunked on mobile/Heroku). */

const CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB — matches server max; fewer round-trips
// Sequential uploads avoid race / flaky mobile drops; still fast enough with 4 MB parts
const PARALLEL_CHUNKS = 1;
const SINGLE_SHOT_MAX = 4 * 1024 * 1024;
const CHUNK_RETRIES = 4;
const CHUNK_TIMEOUT_MS = 55_000;
const JOB_POLL_MS = 2000;
const JOB_MAX_WAIT_MS = 15 * 60 * 1000; // 15 min cap for long video encodes
/** How many times to wait+retry when server convert queue is full (503). */
const QUEUE_RETRIES = 3;
const QUEUE_RETRY_MS = 12_000;

export type UploadProgress = {
  percent: number;
  phase: "reading" | "uploading" | "converting" | "queued";
  loadedBytes: number;
  totalBytes: number;
  /** 1-based estimated place in server queue when phase is queued */
  queuePosition?: number;
  queueMessage?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Prefer same-origin absolute URLs so apex vs www never mid-flight drifts. */
function sameOriginUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const base = window.location.origin.replace(/\/$/, "");
    return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  }
  return path;
}

async function postChunk(
  uploadId: string,
  chunkIndex: number,
  chunkTotal: number,
  totalSize: number,
  fileName: string,
  body: ArrayBuffer,
): Promise<void> {
  let lastErr: Error | null = null;
  const url = sameOriginUrl("/api/convert/chunk");
  for (let attempt = 1; attempt <= CHUNK_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Upload-Id": uploadId,
          "X-Chunk-Index": String(chunkIndex),
          "X-Chunk-Total": String(chunkTotal),
          "X-Total-Size": String(totalSize),
          "X-File-Name": encodeURIComponent(fileName),
        },
        body,
        cache: "no-store",
        redirect: "error", // never follow host redirects mid-upload
        signal: controller.signal,
      });
      if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
        throw new Error(
          "Upload redirected off this host. Open https://www.convertek.tech and try again.",
        );
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = `Chunk ${chunkIndex + 1}/${chunkTotal} failed (${res.status})`;
        try {
          const json = JSON.parse(text) as { error?: string };
          if (json.error) msg = json.error;
        } catch {
          if (text) msg = text.slice(0, 160);
        }
        throw new Error(msg);
      }
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        lastErr = new Error(
          `Chunk ${chunkIndex + 1}/${chunkTotal} timed out. Check connection and retry.`,
        );
      } else {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
      if (attempt < CHUNK_RETRIES) {
        await sleep(400 * attempt);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error("Chunk upload failed");
}

/** Poll async job until binary is ready (video → video on Heroku). */
async function waitForConvertJob(
  jobId: string,
  onProgress?: (p: UploadProgress) => void,
  totalBytes = 1,
  initialQueueWaiting = 0,
): Promise<Response> {
  const started = Date.now();
  let tick = 0;
  while (Date.now() - started < JOB_MAX_WAIT_MS) {
    tick += 1;
    const pulse = Math.min(99, 70 + (tick % 25));
    onProgress?.({
      percent: pulse,
      phase: initialQueueWaiting > 0 && tick < 3 ? "queued" : "converting",
      loadedBytes: totalBytes,
      totalBytes,
      queuePosition:
        initialQueueWaiting > 0 ? initialQueueWaiting : undefined,
      queueMessage:
        initialQueueWaiting > 0
          ? `In line for encode (about #${initialQueueWaiting})…`
          : undefined,
    });

    const st = await fetch(
      sameOriginUrl(`/api/convert/job?id=${encodeURIComponent(jobId)}`),
      { cache: "no-store" },
    );
    if (st.status === 404) {
      throw new Error("Conversion job expired. Please try again.");
    }
    const data = (await st.json().catch(() => ({}))) as {
      status?: string;
      error?: string;
    };
    if (data.status === "processing") {
      await sleep(JOB_POLL_MS);
      continue;
    }
    if (data.status === "error" || st.status === 422) {
      throw new Error(data.error || "Video conversion failed");
    }
    if (data.status === "done") {
      onProgress?.({
        percent: 100,
        phase: "converting",
        loadedBytes: totalBytes,
        totalBytes,
      });
      const fileRes = await fetch(
        sameOriginUrl(
          `/api/convert/job?id=${encodeURIComponent(jobId)}&download=1`,
        ),
        { cache: "no-store" },
      );
      if (!fileRes.ok) {
        const errText = await fileRes.text().catch(() => "");
        let msg = `Download failed (${fileRes.status})`;
        try {
          const j = JSON.parse(errText) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          if (errText) msg = errText.slice(0, 160);
        }
        throw new Error(msg);
      }
      return fileRes;
    }
    await sleep(JOB_POLL_MS);
  }
  throw new Error(
    "Video conversion is taking too long. Try lower quality or a shorter clip.",
  );
}

/**
 * POST convert; on 503 queue-full wait and retry a few times.
 * Follows 202 async video jobs.
 */
async function postConvertWithQueue(
  url: string,
  init: RequestInit,
  onProgress: ((p: UploadProgress) => void) | undefined,
  totalBytes: number,
): Promise<Response> {
  let lastMessage =
    "Server is busy converting other files. Wait a moment and try again.";
  const absoluteUrl = sameOriginUrl(url);

  for (let attempt = 0; attempt <= QUEUE_RETRIES; attempt++) {
    const res = await fetch(absoluteUrl, {
      ...init,
      cache: "no-store",
      redirect: "error",
    });

    if (res.status === 503) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        queuePosition?: number;
      };
      const position =
        typeof data.queuePosition === "number" ? data.queuePosition : attempt + 1;
      lastMessage =
        data.error ||
        `Server busy — you are about #${position} in line. Retrying…`;
      onProgress?.({
        percent: 88,
        phase: "queued",
        loadedBytes: totalBytes,
        totalBytes,
        queuePosition: position,
        queueMessage: lastMessage,
      });
      if (attempt >= QUEUE_RETRIES) {
        throw new Error(lastMessage);
      }
      await sleep(QUEUE_RETRY_MS);
      continue;
    }

    if (res.status === 202) {
      const data = (await res.json().catch(() => ({}))) as {
        jobId?: string;
        error?: string;
        queueWaiting?: number;
        message?: string;
      };
      if (!data.jobId) {
        throw new Error(data.error || "Video job did not start");
      }
      const waiting = data.queueWaiting ?? 0;
      if (waiting > 0 || data.message) {
        onProgress?.({
          percent: 72,
          phase: waiting > 0 ? "queued" : "converting",
          loadedBytes: totalBytes,
          totalBytes,
          queuePosition: waiting > 0 ? waiting : undefined,
          queueMessage: data.message,
        });
      }
      return waitForConvertJob(data.jobId, onProgress, totalBytes, waiting);
    }

    return res;
  }

  throw new Error(lastMessage);
}

function newUploadId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "")
    : `up${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Stage a file on the server via chunked upload (no conversion).
 * Returns uploadId for a later convert POST with X-Upload-Id.
 */
export async function stageFileUpload(options: {
  file: File;
  fileName: string;
  onProgress?: (p: UploadProgress) => void;
}): Promise<string> {
  const { file, fileName, onProgress } = options;

  if (!file.size) {
    throw new Error("The selected file is empty. Pick another file.");
  }

  const report = (p: UploadProgress) => {
    try {
      onProgress?.(p);
    } catch {
      // ignore
    }
  };

  const uploadId = newUploadId();
  const chunkTotal = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  let loaded = 0;

  report({
    percent: 0,
    phase: "uploading",
    loadedBytes: 0,
    totalBytes: file.size,
  });

  for (let i = 0; i < chunkTotal; i += PARALLEL_CHUNKS) {
    const batch: Promise<void>[] = [];
    for (let j = i; j < Math.min(i + PARALLEL_CHUNKS, chunkTotal); j++) {
      const start = j * CHUNK_BYTES;
      const end = Math.min(start + CHUNK_BYTES, file.size);
      batch.push(
        (async () => {
          const slice = file.slice(start, end);
          const bytes = await slice.arrayBuffer();
          if (bytes.byteLength !== end - start) {
            throw new Error(
              `Failed to read file chunk ${j + 1}/${chunkTotal}. Re-select the file and retry.`,
            );
          }
          await postChunk(uploadId, j, chunkTotal, file.size, fileName, bytes);
          loaded += bytes.byteLength;
          const percent = Math.min(99, Math.round((loaded / file.size) * 100));
          report({
            percent,
            phase: "uploading",
            loadedBytes: loaded,
            totalBytes: file.size,
          });
        })(),
      );
    }
    await Promise.all(batch);
  }

  report({
    percent: 100,
    phase: "uploading",
    loadedBytes: file.size,
    totalBytes: file.size,
  });

  return uploadId;
}

/**
 * Upload a file for conversion. Video→video uses async job + poll (Heroku-safe).
 * Pass `uploadId` when the file was already staged with stageFileUpload().
 */
export async function uploadAndConvert(options: {
  file: File;
  fileName: string;
  sourceExt: string;
  targetFormat: string;
  quality: number;
  resizeWidth?: number | null;
  resizeHeight?: number | null;
  convertUrl: string;
  /** Pre-staged session from stageFileUpload — skips re-upload */
  uploadId?: string | null;
  onProgress?: (p: UploadProgress) => void;
}): Promise<Response> {
  const {
    file,
    fileName,
    targetFormat,
    quality,
    resizeWidth,
    resizeHeight,
    convertUrl,
    uploadId: stagedUploadId,
    onProgress,
  } = options;

  const convertHeaders: Record<string, string> = {
    "X-File-Name": encodeURIComponent(fileName),
    "X-Target-Format": targetFormat,
    "X-Quality": String(quality),
  };
  if (resizeWidth) convertHeaders["X-Width"] = String(resizeWidth);
  if (resizeHeight) convertHeaders["X-Height"] = String(resizeHeight);

  const report = (p: UploadProgress) => {
    try {
      onProgress?.(p);
    } catch {
      // ignore
    }
  };

  // Already staged on server — convert only
  if (stagedUploadId) {
    report({
      percent: 90,
      phase: "converting",
      loadedBytes: file.size,
      totalBytes: file.size,
    });
    return postConvertWithQueue(
      convertUrl,
      {
        method: "POST",
        headers: {
          ...convertHeaders,
          "Content-Type": file.type || "application/octet-stream",
          "X-Upload-Id": stagedUploadId,
        },
        body: new Uint8Array(0),
      },
      onProgress,
      file.size,
    );
  }

  if (file.size <= SINGLE_SHOT_MAX) {
    report({
      percent: 15,
      phase: "reading",
      loadedBytes: 0,
      totalBytes: file.size,
    });
    const fileBytes = await file.arrayBuffer();
    if (!fileBytes.byteLength) {
      throw new Error("The selected file is empty. Pick another file.");
    }
    report({
      percent: 55,
      phase: "uploading",
      loadedBytes: file.size,
      totalBytes: file.size,
    });
    report({
      percent: 85,
      phase: "converting",
      loadedBytes: file.size,
      totalBytes: file.size,
    });
    return postConvertWithQueue(
      convertUrl,
      {
        method: "POST",
        headers: {
          ...convertHeaders,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: fileBytes,
      },
      onProgress,
      file.size,
    );
  }

  const uploadId = newUploadId();

  const chunkTotal = Math.ceil(file.size / CHUNK_BYTES);
  let loaded = 0;
  report({
    percent: 0,
    phase: "uploading",
    loadedBytes: 0,
    totalBytes: file.size,
  });

  for (let i = 0; i < chunkTotal; i += PARALLEL_CHUNKS) {
    const batch: Promise<void>[] = [];
    for (let j = i; j < Math.min(i + PARALLEL_CHUNKS, chunkTotal); j++) {
      const start = j * CHUNK_BYTES;
      const end = Math.min(start + CHUNK_BYTES, file.size);
      batch.push(
        (async () => {
          const slice = file.slice(start, end);
          const bytes = await slice.arrayBuffer();
          if (bytes.byteLength !== end - start) {
            throw new Error(
              `Failed to read file chunk ${j + 1}/${chunkTotal}. Re-select the file and retry.`,
            );
          }
          await postChunk(uploadId, j, chunkTotal, file.size, fileName, bytes);
          loaded += bytes.byteLength;
          const percent = Math.min(85, Math.round((loaded / file.size) * 85));
          report({
            percent,
            phase: "uploading",
            loadedBytes: loaded,
            totalBytes: file.size,
          });
        })(),
      );
    }
    await Promise.all(batch);
  }

  report({
    percent: 90,
    phase: "converting",
    loadedBytes: file.size,
    totalBytes: file.size,
  });

  return postConvertWithQueue(
    convertUrl,
    {
      method: "POST",
      headers: {
        ...convertHeaders,
        "Content-Type": file.type || "application/octet-stream",
        "X-Upload-Id": uploadId,
      },
      body: new Uint8Array(0),
    },
    onProgress,
    file.size,
  );
}
