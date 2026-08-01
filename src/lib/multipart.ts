import Busboy from "busboy";
import { Readable } from "stream";

export type ParsedUploadFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type ParsedMultipart = {
  fields: Record<string, string>;
  file: ParsedUploadFile | null;
};

/**
 * Parse multipart/form-data more reliably than request.formData() for larger
 * uploads (Heroku / Node undici often fails FormData around tens of MB).
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
  if (body.length > maxFileBytes + 2 * 1024 * 1024) {
    // Allow small multipart overhead beyond the file cap.
    throw new Error(`Upload exceeds maximum size (${Math.round(maxFileBytes / (1024 * 1024))} MB)`);
  }

  return await new Promise<ParsedMultipart>((resolve, reject) => {
    const fields: Record<string, string> = {};
    let file: ParsedUploadFile | null = null;
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const done = () => {
      if (settled) return;
      settled = true;
      resolve({ fields, file });
    };

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: {
        files: 1,
        fileSize: maxFileBytes,
        fieldSize: 64 * 1024,
      },
    });

    busboy.on("file", (_name, stream, info) => {
      const chunks: Buffer[] = [];
      let truncated = false;

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      stream.on("limit", () => {
        truncated = true;
      });
      stream.on("error", (err) => fail(err instanceof Error ? err : new Error(String(err))));
      stream.on("end", () => {
        if (truncated) {
          fail(
            new Error(
              `Upload exceeds maximum size (${Math.round(maxFileBytes / (1024 * 1024))} MB)`,
            ),
          );
          return;
        }
        file = {
          filename: info.filename || "upload.bin",
          mimeType: info.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });
    busboy.on("error", (err) =>
      fail(err instanceof Error ? err : new Error(String(err))),
    );
    busboy.on("finish", done);
    busboy.on("close", done);

    Readable.from(body).pipe(busboy);
  });
}
