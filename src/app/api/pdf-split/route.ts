import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
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

    let srcPdf: PDFDocument;
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

    const zip = new JSZip();
    const baseName = file.name.replace(/\.pdf$/i, "");

    for (let i = 0; i < pageCount; i++) {
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(srcPdf, [i]);
      singlePagePdf.addPage(copiedPage);

      const pdfBytes = await singlePagePdf.save();
      const pageName = `${baseName}-page-${String(i + 1).padStart(3, "0")}`;

      if (targetFormat === "pdf") {
        zip.file(`${pageName}.pdf`, pdfBytes);
      } else {
        try {
          const sharp = (await import("sharp")).default;
          const pngBuf = await sharp(Buffer.from(pdfBytes), {
            density: 150,
            failOn: "none",
          })
            .png()
            .toBuffer();

          if (targetFormat === "png") {
            zip.file(`${pageName}.png`, pngBuf);
          } else if (targetFormat === "jpg" || targetFormat === "jpeg") {
            const jpgBuf = await sharp(pngBuf).jpeg({ quality: 90 }).toBuffer();
            zip.file(`${pageName}.jpg`, jpgBuf);
          } else if (targetFormat === "webp") {
            const webpBuf = await sharp(pngBuf)
              .webp({ quality: 90 })
              .toBuffer();
            zip.file(`${pageName}.webp`, webpBuf);
          } else {
            zip.file(`${pageName}.png`, pngBuf);
          }
        } catch {
          zip.file(`${pageName}.pdf`, pdfBytes);
        }
      }
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
