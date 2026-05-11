import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { convertFile, getMimeType } from "@/lib/converter";
import { detectCategory, getFormatByExt } from "@/lib/formats";

export async function POST(request: NextRequest) {
  try {
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
    const buffer = Buffer.from(await file.arrayBuffer());
    const startTime = Date.now();

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

      // Log failed conversion
      await db.conversion.create({
        data: {
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

      return NextResponse.json({ error: errorMessage }, { status: 422 });
    }

    const duration = Date.now() - startTime;
    const outputSize = result.length;

    // Log successful conversion
    await db.conversion.create({
      data: {
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

    // Build a safe filename for the Content-Disposition header
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const safeName = `${baseName}.${target}`.replace(/"/g, '\\"');

    return new NextResponse(result as any, {
      headers: {
        "Content-Type": getMimeType(target),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(outputSize),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
