import Busboy from "busboy";

export type ParsedUploadFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type ParsedMultipart = {
  fields: Record<string, string>;
  file: ParsedUploadFile | null;
};

function parseWithBusboy(
  contentType: string,
  body: Buffer,
  maxFileBytes: number,
): Promise<ParsedMultipart> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let fileResult: ParsedUploadFile | null = null;
    let fileConsumed: Promise<void> = Promise.resolve();
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: {
        files: 1,
        fileSize: maxFileBytes,
        fieldSize: 256 * 1024,
      },
      defParamCharset: "utf8",
    });

    busboy.on("file", (_name, stream, info) => {
      const chunks: Buffer[] = [];
      let truncated = false;

      fileConsumed = new Promise<void>((fileResolve, fileReject) => {
        stream.on("data", (chunk: Buffer) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        stream.on("limit", () => {
          truncated = true;
        });
        stream.on("error", (err) => {
          fileReject(err instanceof Error ? err : new Error(String(err)));
        });
        stream.on("end", () => {
          if (truncated) {
            fileReject(
              new Error(
                `Upload exceeds maximum size (${Math.round(maxFileBytes / (1024 * 1024))} MB)`,
              ),
            );
            return;
          }
          fileResult = {
            filename: info.filename || "upload.bin",
            mimeType: info.mimeType || "application/octet-stream",
            buffer: Buffer.concat(chunks),
          };
          fileResolve();
        });
      });
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("error", (err) => {
      fail(err instanceof Error ? err : new Error(String(err)));
    });

    busboy.on("finish", () => {
      void fileConsumed
        .then(() => {
          if (settled) return;
          settled = true;
          resolve({ fields, file: fileResult });
        })
        .catch(fail);
    });

    busboy.end(body);
  });
}

/**
 * Preferred upload mode: raw file bytes + metadata headers.
 * Avoids multipart/FormData parsers that fail on Heroku for video-sized bodies.
 *
 * Headers:
 * - X-File-Name (URI-encoded)
 * - X-Target-Format
 * - X-Quality (optional)
 * - X-Width / X-Height (optional)
 */
async function parseRawBinaryUpload(
  request: Request,
  maxFileBytes: number,
): Promise<ParsedMultipart | null> {
  const targetFormat = request.headers.get("x-target-format")?.trim();
  if (!targetFormat) return null;

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Empty upload body");
  }
  if (buffer.length > maxFileBytes) {
    throw new Error(
      `Upload exceeds maximum size (${Math.round(maxFileBytes / (1024 * 1024))} MB)`,
    );
  }

  let filename = "upload.bin";
  const rawName = request.headers.get("x-file-name");
  if (rawName) {
    try {
      filename = decodeURIComponent(rawName);
    } catch {
      filename = rawName;
    }
  }

  return {
    fields: {
      targetFormat,
      quality: request.headers.get("x-quality") || "85",
      width: request.headers.get("x-width") || "",
      height: request.headers.get("x-height") || "",
    },
    file: {
      filename,
      mimeType: request.headers.get("content-type") || "application/octet-stream",
      buffer,
    },
  };
}

/**
 * Parse convert upload: raw binary headers first, multipart only as legacy fallback.
 */
export async function parseMultipartUpload(
  request: Request,
  maxFileBytes: number,
): Promise<ParsedMultipart> {
  const raw = await parseRawBinaryUpload(request, maxFileBytes);
  if (raw) return raw;

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error(
      "Expected raw binary upload (X-Target-Format) or multipart/form-data",
    );
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0) {
    throw new Error("Empty upload body");
  }
  if (body.length > maxFileBytes + 3 * 1024 * 1024) {
    throw new Error(
      `Upload exceeds maximum size (${Math.round(maxFileBytes / (1024 * 1024))} MB)`,
    );
  }

  return parseWithBusboy(contentType, body, maxFileBytes);
}
