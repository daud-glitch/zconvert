/** Client helpers for reliable large media uploads (chunked on mobile/Heroku). */

const CHUNK_BYTES = 2 * 1024 * 1024; // 2 MB — safely under flaky mobile/proxy limits
const SINGLE_SHOT_MAX = 3 * 1024 * 1024; // prefer chunking above ~3 MB
const CHUNK_RETRIES = 3;

export type UploadProgress = {
  /** 0–100 overall: upload portion then convert waits at 100 until server done */
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
        await sleep(400 * attempt);
      }
    }
  }
  throw lastErr || new Error("Chunk upload failed");
}

/**
 * Upload a file for conversion. Large media uses chunked upload so mobile
 * networks / Heroku don't truncate a single large POST body.
 * Conversion starts only after upload finishes.
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
      // ignore UI callback errors
    }
  };

  // Small files: single request (still report progress for UX)
  if (file.size <= SINGLE_SHOT_MAX) {
    report({
      percent: 10,
      phase: "reading",
      loadedBytes: 0,
      totalBytes: file.size,
    });
    const fileBytes = await file.arrayBuffer();
    if (!fileBytes.byteLength) {
      throw new Error("The selected file is empty. Pick another file.");
    }
    report({
      percent: 45,
      phase: "uploading",
      loadedBytes: file.size,
      totalBytes: file.size,
    });
    report({
      percent: 100,
      phase: "converting",
      loadedBytes: file.size,
      totalBytes: file.size,
    });
    return fetch(convertUrl, {
      method: "POST",
      headers: {
        ...convertHeaders,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileBytes,
      cache: "no-store",
    });
  }

  // Large files: chunked upload then convert by upload id
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

  for (let i = 0; i < chunkTotal; i++) {
    const start = i * CHUNK_BYTES;
    const end = Math.min(start + CHUNK_BYTES, file.size);
    const slice = file.slice(start, end);
    const bytes = await slice.arrayBuffer();
    if (bytes.byteLength !== end - start) {
      throw new Error(
        `Failed to read file chunk ${i + 1}/${chunkTotal}. Re-select the file and retry.`,
      );
    }
    await postChunk(uploadId, i, chunkTotal, file.size, fileName, bytes);
    loaded = end;
    // Upload occupies 0–95%; convert waits at 100% after
    const percent = Math.min(95, Math.round((loaded / file.size) * 95));
    report({
      percent,
      phase: "uploading",
      loadedBytes: loaded,
      totalBytes: file.size,
    });
  }

  report({
    percent: 100,
    phase: "converting",
    loadedBytes: file.size,
    totalBytes: file.size,
  });

  return fetch(convertUrl, {
    method: "POST",
    headers: {
      ...convertHeaders,
      "Content-Type": file.type || "application/octet-stream",
      "X-Upload-Id": uploadId,
    },
    body: new Uint8Array(0),
    cache: "no-store",
  });
}
