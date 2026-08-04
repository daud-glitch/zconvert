import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  getMaxUploadBytesForExt,
  getServerMaxUploadBytes,
  isVideoSourceExt,
  payloadTooLargeMessage,
} from "@/lib/upload-limits";
import {
  CHUNK_UPLOAD_MAX_BYTES,
  saveUploadChunk,
} from "@/lib/chunked-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

function withRateLimit(
  res: NextResponse,
  rl: ReturnType<typeof checkRateLimit>,
): NextResponse {
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
    if (v) res.headers.set(k, v);
  });
  return res;
}

/** Accept one binary chunk for a media upload session (mobile-safe). */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`chunk:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return withRateLimit(
      NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      ),
      rl,
    );
  }

  try {
    const uploadId = request.headers.get("x-upload-id")?.trim();
    const chunkIndex = Number(request.headers.get("x-chunk-index"));
    const chunkTotal = Number(request.headers.get("x-chunk-total"));
    const totalSize = Number(request.headers.get("x-total-size"));
    let filename = "upload.bin";
    const rawName = request.headers.get("x-file-name");
    if (rawName) {
      try {
        filename = decodeURIComponent(rawName);
      } catch {
        filename = rawName;
      }
    }

    if (!uploadId) {
      return withRateLimit(
        NextResponse.json({ error: "X-Upload-Id required" }, { status: 400 }),
        rl,
      );
    }

    const maxBody = getServerMaxUploadBytes();
    const ext =
      filename.lastIndexOf(".") >= 0
        ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
        : "";
    const maxBytes = Math.min(maxBody, getMaxUploadBytesForExt(ext));
    if (Number.isFinite(totalSize) && totalSize > maxBytes) {
      return withRateLimit(
        NextResponse.json(
          {
            error: payloadTooLargeMessage(totalSize, {
              kind: isVideoSourceExt(ext) ? "video" : "file",
            }),
          },
          { status: 413 },
        ),
        rl,
      );
    }

    const data = Buffer.from(await request.arrayBuffer());
    if (data.length === 0) {
      return withRateLimit(
        NextResponse.json({ error: "Empty chunk body" }, { status: 400 }),
        rl,
      );
    }
    if (data.length > CHUNK_UPLOAD_MAX_BYTES) {
      return withRateLimit(
        NextResponse.json(
          {
            error: `Chunk too large (max ${Math.round(CHUNK_UPLOAD_MAX_BYTES / (1024 * 1024))} MB)`,
          },
          { status: 413 },
        ),
        rl,
      );
    }

    const result = await saveUploadChunk({
      uploadId,
      chunkIndex,
      chunkTotal,
      totalSize,
      filename,
      data,
    });

    return withRateLimit(
      NextResponse.json({
        success: true,
        receivedCount: result.receivedCount,
        complete: result.complete,
        chunkIndex,
        chunkTotal,
      }),
      rl,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chunk upload failed";
    return withRateLimit(
      NextResponse.json({ error: message }, { status: 400 }),
      rl,
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Upload-Id, X-Chunk-Index, X-Chunk-Total, X-Total-Size, X-File-Name",
      "Access-Control-Max-Age": "86400",
    },
  });
}
