import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { convertFile, getMimeType } from "@/lib/converter";
import { detectCategory, getFormatByExt } from "@/lib/formats";
import { checkRateLimit, rateLimitHeaders, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE =
  (parseInt(process.env.MAX_UPLOAD_SIZE_MB || "100", 10) || 100) *
  1024 *
  1024;

const FORBIDDEN_FILENAME_PATTERN = /[/\\:*?"<>|~\x00-\x1f]/;

/** Attach rate limit headers to any response. */
function withRateLimit(
  res: NextResponse,
  rl: ReturnType<typeof checkRateLimit>,
): NextResponse {
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
    if (v) res.headers.set(k, v);
  });
  return res;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per IP
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

    const formData = await request.formData();
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
    const targetFormatInfo = getFormatByExt(target);

    if (!targetFormatInfo) {
      return NextResponse.json(
        { error: `Unsupported target format: ${targetFormat}` },
        { status: 400 },
      );
    }

    // Extract source extension from the file name
    const fileName = file.name;

    // Validate file name — reject path separators and control characters
    if (FORBIDDEN_FILENAME_PATTERN.test(fileName)) {
      return NextResponse.json(
        { error: "Invalid file name" },
        { status: 400 },
      );
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

    const inputSize = file.size;

    // Validate file size
    if (inputSize > MAX_UPLOAD_SIZE) {
      const maxMB = Math.round(MAX_UPLOAD_SIZE / 1024 / 1024);
      return NextResponse.json(
        {
          error: `File too large. Maximum allowed size is ${maxMB}MB.`,
        },
        { status: 413 },
      );
    }

    if (inputSize === 0) {
      return NextResponse.json(
        { error: "Empty file provided" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const startTime = Date.now();
    
    // Get current user if logged in
    const user = await getSessionUser(request);
    const userId = user?.id || null;

    let result: Buffer;
    try {
      result = await convertFile(
        buffer,
        sourceExt,
        target,
        quality,
        width,
        height,
      );
    } catch (convertError) {
      const errorMessage =
        convertError instanceof Error
          ? convertError.message
          : "Unknown conversion error";

      // Log failed conversion (optional, don't crash if DB is down)
      if (userId) {
        try {
          await db.conversion.create({
            data: {
              userId,
              fileName,
              originalExt: sourceExt,
              targetExt: target,
              category: detectCategory(file.type || "application/octet-stream"),
              inputSize,
              outputSize: 0,
              status: "failed",
              duration: Date.now() - startTime,
              error: errorMessage,
            },
          });
        } catch (dbError) {
          console.error("Failed to log failed conversion to database:", dbError);
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: 422 });
    }

    const duration = Date.now() - startTime;
    const outputSize = result.length;
    let conversionId = "";

    // Log successful conversion (optional, don't crash if DB is down)
    if (userId) {
      try {
        const record = await db.conversion.create({
          data: {
            userId,
            fileName,
            originalExt: sourceExt,
            targetExt: target,
            category: detectCategory(file.type || "application/octet-stream"),
            inputSize,
            outputSize,
            status: "completed",
            duration,
          },
        });
        conversionId = record.id;
      } catch (dbError) {
        console.error("Failed to log successful conversion to database:", dbError);
      }
    }

    // Build a safe filename for the Content-Disposition header
    // Use ASCII-only for 'filename' and encodeURIComponent for 'filename*'
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const asciiName = baseName.replace(/[^\x20-\x7E]/g, "_");
    const safeName = `${asciiName}.${target}`.replace(/"/g, '\\"');
    const encodedName = encodeURIComponent(`${baseName}.${target}`);

    return new NextResponse(result as unknown as BodyInit, {
      headers: {
        // Use application/octet-stream to bypass IDM (Internet Download Manager) interception
        // which often breaks AJAX fetches for PDF/ZIP files.
        "Content-Type": "application/octet-stream",
        "X-Original-Content-Type": getMimeType(target),
        "X-Conversion-Id": conversionId,
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(outputSize),
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, X-Original-Content-Type, X-Conversion-Id",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const res = NextResponse.json({ error: message }, { status: 500 });
    
    // Attempt to add rate limit headers if ip is available
    try {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const rl = checkRateLimit(`convert:${ip}`, 30, 60_000);
      return withRateLimit(res, rl);
    } catch {
      return res;
    }
  }
}
