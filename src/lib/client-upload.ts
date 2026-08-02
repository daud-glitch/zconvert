/** Client helpers for reliable large media uploads (chunked on mobile/Heroku). */

const CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB — matches server max; fewer round-trips
const PARALLEL_CHUNKS = 3;
const SINGLE_SHOT_MAX = 4 * 1024 * 1024;
const CHUNK_RETRIES = 2;
const JOB_POLL_MS = 2000;
const JOB_MAX_WAIT_MS = 15 * 60 * 1000; // 15 min cap for long video encodes

export type UploadProgress = {
  percent: number;
  phase: "reading" | "uploading" | "converting";
  loadedBytes: number;
  totalBytes: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
  for (let attempt = 1; attempt <= CHUNK_RETRIES; attempt++) {
    try {
      const res = await fetch("/api/convert/chunk", {
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
      });
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
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < CHUNK_RETRIES) {
        await sleep(250 * attempt);
      }
    }
  }
  throw lastErr || new Error("Chunk upload failed");
}

/** Poll async job until binary is ready (video → video on Heroku). */
async function waitForConvertJob(
  jobId: string,
  onProgress?: (p: UploadProgress) => void,
  totalBytes = 1,
): Promise<Response> {
  const started = Date.now();
  let tick = 0;
  while (Date.now() - started < JOB_MAX_WAIT_MS) {
    tick += 1;
    // Pulse progress so UI stays in "converting" state with movement
    const pulse = Math.min(99, 70 + (tick % 25));
    onProgress?.({
      percent: pulse,
      phase: "converting",
      loadedBytes: totalBytes,
      totalBytes,
    });

    const st = await fetch(
      `/api/convert/job?id=${encodeURIComponent(jobId)}`,
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
        `/api/convert/job?id=${encodeURIComponent(jobId)}&download=1`,
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
 * After convert POST, follow async job if server returned 202.
 */
async function finalizeConvertResponse(
  res: Response,
  onProgress?: (p: UploadProgress) => void,
  totalBytes = 1,
): Promise<Response> {
  if (res.status !== 202) return res;
  const data = (await res.json().catch(() => ({}))) as {
    jobId?: string;
    error?: string;
  };
  if (!data.jobId) {
    throw new Error(data.error || "Video job did not start");
  }
  return waitForConvertJob(data.jobId, onProgress, totalBytes);
}

/**
 * Upload a file for conversion. Video→video uses async job + poll (Heroku-safe).
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
    const res = await fetch(convertUrl, {
      method: "POST",
      headers: {
        ...convertHeaders,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileBytes,
      cache: "no-store",
    });
    return finalizeConvertResponse(res, onProgress, file.size);
  }

  const uploadId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : `up${Date.now()}${Math.random().toString(36).slice(2, 10)}`;

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

  const res = await fetch(convertUrl, {
    method: "POST",
    headers: {
      ...convertHeaders,
      "Content-Type": file.type || "application/octet-stream",
      "X-Upload-Id": uploadId,
    },
    body: new Uint8Array(0),
    cache: "no-store",
  });
  return finalizeConvertResponse(res, onProgress, file.size);
}
