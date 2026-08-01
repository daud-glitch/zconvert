import { NextRequest, NextResponse } from "next/server";
import { isPdfRasterTarget } from "@/lib/pdf-raster-targets";
import { getMimeType } from "@/lib/mime-types";
import { isConversionPairListed } from "@/lib/formats";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  audioUnavailableMessage,
  videoUnavailableMessage,
  getServerMaxUploadBytes,
  isAudioConversionAvailable,
  isVideoConversionAvailable,
  payloadTooLargeMessage,
  normalizePayloadError,
} from "@/lib/upload-limits";
import { getFormatByExt } from "@/lib/formats";
import { getSessionUser } from "@/lib/auth";
import { logConversion } from "@/lib/conversion-log";

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

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      const raw =
        parseErr instanceof Error ? parseErr.message : String(parseErr);
      const contentLength = request.headers.get("content-length");
      const sizeHint = contentLength
        ? ` Upload size header: ${(Number(contentLength) / (1024 * 1024)).toFixed(1)} MB.`
        : "";
      return NextResponse.json(
        {
          error: normalizePayloadError(
            raw.toLowerCase().includes("formdata") ||
              raw.toLowerCase().includes("body")
              ? `Failed to read uploaded file.${sizeHint} Host may reject large multipart bodies (Heroku router ~30 MB). Use a smaller file or raise platform body limits.`
              : raw,
          ),
        },
        { status: 400 },
      );
    }
    const file = formData.get("file") as File | null;
    const targetFormat = formData.get("targetFormat") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!targetFormat) {
      return NextResponse.json(
        { error: "No target format specified" },
        { status: 400 },
      );
    }

    const quality = parseInt(formData.get("quality") as string) || 85;
    const width = parseInt(formData.get("width") as string) || null;
    const height = parseInt(formData.get("height") as string) || null;
    const target = targetFormat.toLowerCase().replace(/^\./, "");

    if (!getFormatByExt(target)) {
      return NextResponse.json(
        { error: `Unsupported target format: ${targetFormat}` },
        { status: 400 },
      );
    }

    const fileName = file.name;
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

    const sourceFormatInfo = getFormatByExt(sourceExt);
    if (!sourceFormatInfo) {
      return NextResponse.json(
        { error: `Unsupported source format: ${sourceExt}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: payloadTooLargeMessage(file.size) },
        { status: 413 },
      );
    }

    if (
      !isAudioConversionAvailable() &&
      (sourceFormatInfo.category === "audio" ||
        getFormatByExt(target)?.category === "audio")
    ) {
      return NextResponse.json(
        { error: audioUnavailableMessage() },
        { status: 422 },
      );
    }
    if (
      !isVideoConversionAvailable() &&
      (sourceFormatInfo.category === "video" ||
        getFormatByExt(target)?.category === "video")
    ) {
      return NextResponse.json(
        { error: videoUnavailableMessage() },
        { status: 422 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file provided" }, { status: 400 });
    }

    if (!isConversionPairListed(sourceExt, target)) {
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const startTime = Date.now();
    const sessionUser = await getSessionUser(request);
    const category = sourceFormatInfo.category;

    let result: Buffer;
    let pdfZipMeta: { pageCount: number } | undefined;

    try {
      if (sourceExt === "pdf" && isPdfRasterTarget(target)) {
        const { convertPdfToRasterOutput } = await import("@/lib/pdf-utils");
        const baseName = fileName.replace(/\.pdf$/i, "");
        const pdfOut = await convertPdfToRasterOutput(
          buffer,
          target,
          quality,
          baseName,
        );
        result = pdfOut.data;
        if (pdfOut.type === "zip") {
          pdfZipMeta = { pageCount: pdfOut.pageCount };
        }
      } else {
        const out = await runConvert(
          buffer,
          sourceExt,
          target,
          quality,
          width,
          height,
        );
        result = out.buffer;
        pdfZipMeta = out.pdfZipMeta;
      }
    } catch (convertError) {
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
        inputSize: file.size,
        outputSize: 0,
        status: "error",
        duration: Date.now() - startTime,
        error: errorMessage,
        ipAddress: ip === "unknown" ? null : ip,
      });
      return NextResponse.json({ error: errorMessage }, { status: 422 });
    }

    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const asciiName = baseName.replace(/[^\x20-\x7E]/g, "_");
    const outputExt = pdfZipMeta ? "zip" : target;
    const downloadBase = pdfZipMeta ? `${asciiName}-pages` : asciiName;
    const safeName = `${downloadBase}.${outputExt}`.replace(/"/g, '\\"');
    const encodedName = encodeURIComponent(
      pdfZipMeta ? `${baseName}-pages.zip` : `${baseName}.${target}`,
    );

    const conversionId = await logConversion({
      userId: sessionUser?.id ?? null,
      fileName,
      originalExt: sourceExt,
      targetExt: outputExt,
      category,
      inputSize: file.size,
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
      "Access-Control-Allow-Origin": "*",
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
      {
        error:
          message.includes("Cannot find module") ||
          message.includes("ENOENT") ||
          message.includes("libquery_engine") ||
          message.toLowerCase().includes("ffmpeg binary not found") ||
          message.toLowerCase().includes("ffmpeg_bin")
            ? `Server misconfiguration: ${message}. Redeploy after npm install && prisma generate.`
            : message.includes("spawn") && message.toLowerCase().includes("ffmpeg")
              ? `ffmpeg failed to start (${message}). On Heroku add buildpack heroku-community/apt (Aptfile includes ffmpeg) or set FFMPEG_BIN.`
              : /ffmpeg exited with code 127|not found or not runnable/i.test(
                  message,
                )
                ? "ffmpeg could not run. On Heroku remove apt ffmpeg from Aptfile/buildpack (it breaks ffmpeg-static), redeploy, or add heroku/heroku-buildpack-activestorage-preview."
                : message,
      },
      { status: 500 },
    );
  }
}
