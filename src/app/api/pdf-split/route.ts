import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/auth";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MAX_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rl = checkRateLimit(`pdf-split:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetFormat = (formData.get("targetFormat") as string) || "png";

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 100MB)" },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const baseName = file.name.replace(/\.pdf$/i, "");
    const zip = new JSZip();

    if (targetFormat === "pdf") {
      const { PDFDocument } = await import("pdf-lib");
      let srcPdf;
      try {
        srcPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      } catch {
        return NextResponse.json(
          { error: "Failed to parse PDF file" },
          { status: 422 },
        );
      }
      const pageCount = srcPdf.getPageCount();
      if (pageCount === 0) {
        return NextResponse.json({ error: "PDF has no pages" }, { status: 422 });
      }
      for (let i = 0; i < pageCount; i++) {
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(srcPdf, [i]);
        singlePagePdf.addPage(copiedPage);
        const pdfBytes = await singlePagePdf.save();
        const pageName = `${baseName}-page-${String(i + 1).padStart(3, "0")}`;
        zip.file(`${pageName}.pdf`, pdfBytes);
      }
      const zipBuffer = Buffer.from(
        await zip.generateAsync({ type: "arraybuffer" }),
      );
      const resp = new NextResponse(zipBuffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${baseName}-pages.zip"`,
          "Content-Length": String(zipBuffer.length),
          "X-Content-Type-Options": "nosniff",
          "X-Page-Count": String(pageCount),
          "Cache-Control": "no-store",
        },
      });
      Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
        if (v) resp.headers.set(k, v);
      });
      return resp;
    }

    let zipResult;
    try {
      const { buildPdfPageImagesZip } = await import("@/lib/pdf-utils");
      zipResult = await buildPdfPageImagesZip(
        buffer,
        targetFormat,
        90,
        baseName,
      );
    } catch {
      return NextResponse.json(
        { error: "Failed to render PDF pages" },
        { status: 422 },
      );
    }

    const resp = new NextResponse(zipResult.zip as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${baseName}-pages.zip"`,
        "Content-Length": String(zipResult.zip.length),
        "X-Content-Type-Options": "nosniff",
        "X-Page-Count": String(zipResult.pageCount),
        "Cache-Control": "no-store",
      },
    });

    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
      if (v) resp.headers.set(k, v);
    });

    return resp;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
