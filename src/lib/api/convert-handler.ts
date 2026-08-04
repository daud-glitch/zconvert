import { NextRequest, NextResponse } from "next/server";
import { isPdfRasterTarget } from "@/lib/pdf-raster-targets";
import { getMimeType } from "@/lib/mime-types";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  audioUnavailableMessage,
  videoUnavailableMessage,
  getServerMaxUploadBytes,
  isAudioConversionAvailable,
  isVideoConversionAvailable,
  humanizeConversionError,
  payloadTooLargeMessage,
  normalizePayloadError,
} from "@/lib/upload-limits";
import {
  isConversionPairAllowed,
  resolveFormatByExt,
} from "@/lib/format-catalog";
import { getSessionUser } from "@/lib/auth";
import { logConversion } from "@/lib/conversion-log";
import { parseMultipartUpload } from "@/lib/multipart";
import {
  createMediaJob,
  markMediaJobDone,
  markMediaJobError,
} from "@/lib/media-job";
import {
  ConvertQueueFullError,
  convertQueueDepth,
  withConvertSlot,
} from "@/lib/convert-queue";
import {
  canEnqueueConvertJob,
  countQueuedConvertJobs,
  enqueueConvertJob,
  isConvertWorkerEnabled,
} from "@/lib/convert-job-store";
import { DOWNLOAD_BRAND_PREFIX } from "@/lib/download-brand";

function corsOrigin(): string {
  return process.env.ALLOWED_ORIGIN?.trim() || "*";
}

const MAX_UPLOAD_SIZE = getServerMaxUploadBytes();

const FORBIDDEN_FILENAME_PATTERN = /[/\\:*?"<>|~\x00-\x1f]/;

export type ConvertRunResult = {
  buffer: Buffer;
  pdfZipMeta?: { pageCount: number };
};

export type ConvertRunner = (
  buffer: Buffer,
  sourceExt: string,
  target: string,
  quality: number,
  width: number | null,
  height: number | null,
) => Promise<ConvertRunResult>;

function withRateLimit(
  res: NextResponse,
  rl: ReturnType<typeof checkRateLimit>,
): NextResponse {
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
    if (v) res.headers.set(k, v);
  });
  return res;
}

/** Shared POST handler — each category route supplies its own converter (smaller Vercel bundle). */
export async function handleConvertPost(
  request: NextRequest,
  runConvert: ConvertRunner,
): Promise<NextResponse> {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rl = checkRateLimit(`convert:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }

    let parsed;
    try {
      parsed = await parseMultipartUpload(request, MAX_UPLOAD_SIZE);
    } catch (parseErr) {
      const raw =
        parseErr instanceof Error ? parseErr.message : String(parseErr);
      const contentLength = request.headers.get("content-length");
      const sizeHint = contentLength
        ? ` Upload size header: ${(Number(contentLength) / (1024 * 1024)).toFixed(1)} MB.`
        : "";
      const lower = raw.toLowerCase();
      const friendly =
        lower.includes("unexpected end of form") ||
        lower.includes("multipart") ||
        lower.includes("formdata")
          ? `Upload parsing failed.${sizeHint} Refresh the page and retry — video/audio now use binary upload (not multipart).`
          : lower.includes("body") || lower.includes("exceeds maximum")
            ? `${raw}${sizeHint}`
            : raw;
      return NextResponse.json(
        { error: normalizePayloadError(friendly) },
        { status: lower.includes("exceeds maximum") ? 413 : 400 },
      );
    }

    const uploaded = parsed.file;
    const targetFormat = parsed.fields.targetFormat || null;

    if (!uploaded || uploaded.buffer.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!targetFormat) {
      return NextResponse.json(
        { error: "No target format specified" },
        { status: 400 },
      );
    }

    const quality = parseInt(parsed.fields.quality || "", 10) || 85;
    const width = parseInt(parsed.fields.width || "", 10) || null;
    const height = parseInt(parsed.fields.height || "", 10) || null;
    const target = targetFormat.toLowerCase().replace(/^\./, "");

    const targetFormatInfo = await resolveFormatByExt(target);
    if (!targetFormatInfo) {
      return NextResponse.json(
        { error: `Unsupported target format: ${targetFormat}` },
        { status: 400 },
      );
    }

    const fileName = uploaded.filename;
    if (FORBIDDEN_FILENAME_PATTERN.test(fileName)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const dotIdx = fileName.lastIndexOf(".");
    const sourceExt =
      dotIdx >= 0 ? fileName.slice(dotIdx + 1).toLowerCase() : "";

    if (!sourceExt) {
      return NextResponse.json(
        { error: "Cannot determine file extension from the file name" },
        { status: 400 },
      );
    }

    const sourceFormatInfo = await resolveFormatByExt(sourceExt);
    if (!sourceFormatInfo) {
      return NextResponse.json(
        { error: `Unsupported source format: ${sourceExt}` },
        { status: 400 },
      );
    }

    if (uploaded.buffer.length > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: payloadTooLargeMessage(uploaded.buffer.length) },
        { status: 413 },
      );
    }

    if (
      !isAudioConversionAvailable() &&
      (sourceFormatInfo.category === "audio" ||
        targetFormatInfo.category === "audio")
    ) {
      return NextResponse.json(
        { error: audioUnavailableMessage() },
        { status: 422 },
      );
    }
    if (
      !isVideoConversionAvailable() &&
      (sourceFormatInfo.category === "video" ||
        targetFormatInfo.category === "video")
    ) {
      return NextResponse.json(
        { error: videoUnavailableMessage() },
        { status: 422 },
      );
    }
    if (uploaded.buffer.length === 0) {
      return NextResponse.json({ error: "Empty file provided" }, { status: 400 });
    }

    if (!(await isConversionPairAllowed(sourceExt, target))) {
      const listed = sourceFormatInfo.targetFormats;
      const hint =
        listed.length > 0
          ? `Supported targets: ${listed.slice(0, 12).join(", ")}${listed.length > 12 ? ", …" : ""}`
          : "No conversions are available for this format.";
      return NextResponse.json(
        {
          error: `Conversion from ${sourceExt.toUpperCase()} to ${target.toUpperCase()} is not supported. ${hint}`,
        },
        { status: 422 },
      );
    }

    const buffer = uploaded.buffer;
    const startTime = Date.now();
    const sessionUser = await getSessionUser(request);
    const category = sourceFormatInfo.category;

    const isVideoJob =
      sourceFormatInfo.category === "video" ||
      targetFormatInfo.category === "video";
    const isVideoToVideo =
      sourceFormatInfo.category === "video" &&
      targetFormatInfo.category === "video";

    const ipAddr = ip === "unknown" ? null : ip;
    const userId = sessionUser?.id ?? null;
    const outFileName = `${fileName.replace(/\.[^/.]+$/, "") || "file"}.${target}`;

    // Prefer Postgres-backed worker dyno (does not block web CPU).
    // Only files ≤ CONVERT_JOB_MAX_MB (default 20MB) fit inline in DB.
    if (canEnqueueConvertJob(buffer.length)) {
      const enqueued = await enqueueConvertJob({
        buffer,
        isVideo: isVideoJob,
        fileName: outFileName,
        contentType: getMimeType(target),
        sourceExt,
        targetExt: target,
        quality,
        width,
        height,
        category,
        userId,
        ipAddress: ipAddr,
      });
      if (enqueued) {
        const waiting = await countQueuedConvertJobs().catch(() => 0);
        return withRateLimit(
          NextResponse.json(
            {
              jobId: enqueued.id,
              status: "processing",
              queueWaiting: Math.max(0, waiting - 1),
              message:
                waiting > 1
                  ? `Queued on convert worker (about #${waiting} in line). Keep this tab open.`
                  : isVideoJob
                    ? "Queued on convert worker. Video may take a few minutes — keep this tab open."
                    : "Queued on convert worker. Keep this tab open.",
            },
            {
              status: 202,
              headers: {
                "Access-Control-Allow-Origin": corsOrigin(),
                "Cache-Control": "no-store",
              },
            },
          ),
          rl,
        );
      }
    }

    // Fallback: long video encodes async on THIS dyno (memory job) when worker
    // is off or file is too large for the DB job queue.
    if (isVideoToVideo) {
      const job = await createMediaJob({
        fileName: outFileName,
        contentType: getMimeType(target),
      });
      const jobId = job.id;

      void (async () => {
        try {
          await withConvertSlot(true, async () => {
            const out = await runConvert(
              buffer,
              sourceExt,
              target,
              quality,
              width,
              height,
            );
            const conversionId = await logConversion({
              userId,
              fileName,
              originalExt: sourceExt,
              targetExt: target,
              category,
              inputSize: buffer.length,
              outputSize: out.buffer.length,
              status: "done",
              duration: Date.now() - startTime,
              ipAddress: ipAddr,
            });
            await markMediaJobDone(jobId, out.buffer, conversionId);
          });
        } catch (convertError) {
          const errorMessage =
            convertError instanceof Error
              ? convertError.message
              : "Unknown conversion error";
          await logConversion({
            userId,
            fileName,
            originalExt: sourceExt,
            targetExt: target,
            category,
            inputSize: buffer.length,
            outputSize: 0,
            status: "error",
            duration: Date.now() - startTime,
            error: errorMessage,
            ipAddress: ipAddr,
          });
          markMediaJobError(jobId, humanizeConversionError(errorMessage));
        }
      })();

      const depth = convertQueueDepth();
      const extra =
        isConvertWorkerEnabled() && buffer.length > 0
          ? " (file larger than worker DB limit — encoding on web dyno)"
          : "";
      return withRateLimit(
        NextResponse.json(
          {
            jobId,
            status: "processing",
            queueWaiting: depth.waiting,
            message:
              depth.waiting > 0
                ? `Video encode queued (about #${depth.waiting} waiting). Keep this tab open.${extra}`
                : `Video encode started. This may take a few minutes — keep this tab open.${extra}`,
          },
          {
            status: 202,
            headers: {
              "Access-Control-Allow-Origin": corsOrigin(),
              "Cache-Control": "no-store",
            },
          },
        ),
        rl,
      );
    }

    let result: Buffer;
    let pdfZipMeta: { pageCount: number } | undefined;

    try {
      const runBody = async () => {
        if (sourceExt === "pdf" && isPdfRasterTarget(target)) {
          const { convertPdfToRasterOutput } = await import("@/lib/pdf-utils");
          const baseName = fileName.replace(/\.pdf$/i, "");
          const pdfOut = await convertPdfToRasterOutput(
            buffer,
            target,
            quality,
            baseName,
          );
          return {
            result: pdfOut.data,
            pdfZipMeta:
              pdfOut.type === "zip"
                ? { pageCount: pdfOut.pageCount }
                : undefined,
          };
        }
        const out = await runConvert(
          buffer,
          sourceExt,
          target,
          quality,
          width,
          height,
        );
        return { result: out.buffer, pdfZipMeta: out.pdfZipMeta };
      };

      const ran = await withConvertSlot(isVideoJob, runBody);
      result = ran.result;
      pdfZipMeta = ran.pdfZipMeta;
    } catch (convertError) {
      if (convertError instanceof ConvertQueueFullError) {
        return withRateLimit(
          NextResponse.json(
            {
              error: convertError.message,
              queuePosition: convertError.position,
            },
            {
              status: 503,
              headers: {
                "Retry-After": "15",
                "Access-Control-Allow-Origin": corsOrigin(),
                "Cache-Control": "no-store",
              },
            },
          ),
          rl,
        );
      }
      const errorMessage =
        convertError instanceof Error
          ? convertError.message
          : "Unknown conversion error";
      await logConversion({
        userId: sessionUser?.id ?? null,
        fileName,
        originalExt: sourceExt,
        targetExt: target,
        category,
        inputSize: buffer.length,
        outputSize: 0,
        status: "error",
        duration: Date.now() - startTime,
        error: errorMessage,
        ipAddress: ip === "unknown" ? null : ip,
      });
      return NextResponse.json(
        { error: humanizeConversionError(errorMessage) },
        { status: 422 },
      );
    }

    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const asciiName = baseName.replace(/[^\x20-\x7E]/g, "_");
    const outputExt = pdfZipMeta ? "zip" : target;
    const downloadBase = pdfZipMeta ? `${asciiName}-pages` : asciiName;
    const brandedBase = downloadBase
      .toLowerCase()
      .startsWith(DOWNLOAD_BRAND_PREFIX.toLowerCase())
      ? downloadBase
      : `${DOWNLOAD_BRAND_PREFIX}-${downloadBase}`;
    const safeName = `${brandedBase}.${outputExt}`.replace(/"/g, '\\"');
    const encodedName = encodeURIComponent(
      pdfZipMeta
        ? `${brandedBase}.zip`
        : `${brandedBase}.${target}`,
    );

    const conversionId = await logConversion({
      userId: sessionUser?.id ?? null,
      fileName,
      originalExt: sourceExt,
      targetExt: outputExt,
      category,
      inputSize: buffer.length,
      outputSize: result.length,
      status: "done",
      duration: Date.now() - startTime,
      ipAddress: ip === "unknown" ? null : ip,
    });

    const responseHeaders: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "X-Original-Content-Type": pdfZipMeta
        ? "application/zip"
        : getMimeType(target),
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(result.length),
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Expose-Headers":
        "Content-Disposition, Content-Length, X-Original-Content-Type, X-Conversion-Id, X-Output-Package, X-Page-Count",
      "Access-Control-Allow-Origin": corsOrigin(),
      "Cache-Control": "no-store",
    };

    if (conversionId) {
      responseHeaders["X-Conversion-Id"] = conversionId;
    }

    if (pdfZipMeta) {
      responseHeaders["X-Output-Package"] = "zip";
      responseHeaders["X-Page-Count"] = String(pdfZipMeta.pageCount);
    }

    return withRateLimit(
      new NextResponse(result as unknown as BodyInit, { headers: responseHeaders }),
      rl,
    );
  } catch (error) {
    console.error("[api/convert] Unhandled error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: humanizeConversionError(message) },
      { status: 500 },
    );
  }
}
