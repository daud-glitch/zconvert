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

async function parseWithNativeFormData(
  contentType: string,
  body: Buffer,
): Promise<ParsedMultipart> {
  const rebuilt = new Request("http://local.upload/convert", {
    method: "POST",
    headers: { "content-type": contentType },
    body: new Uint8Array(body),
  });
  const formData = await rebuilt.formData();
  const fields: Record<string, string> = {};
  let file: ParsedUploadFile | null = null;

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      fields[key] = value;
      continue;
    }
    if (file) continue;
    const ab = Buffer.from(await value.arrayBuffer());
    file = {
      filename: value.name || "upload.bin",
      mimeType: value.type || "application/octet-stream",
      buffer: ab,
    };
  }

  return { fields, file };
}

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

    // Important: write the full buffer then end — pipe(Readable.from) often
    // triggers busboy "Unexpected end of form" on Heroku.
    busboy.end(body);
  });
}

/**
 * Parse multipart upload for convert routes.
 * Prefer buffered native FormData; fall back to busboy with end(buffer).
 */
export async function parseMultipartUpload(
  request: Request,
  maxFileBytes: number,
): Promise<ParsedMultipart> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data upload");
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

  try {
    const native = await parseWithNativeFormData(contentType, body);
    if (native.file && native.file.buffer.length > 0) {
      return native;
    }
  } catch {
    // fall through to busboy
  }

  return parseWithBusboy(contentType, body, maxFileBytes);
}
