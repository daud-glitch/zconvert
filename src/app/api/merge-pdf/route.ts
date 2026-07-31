import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { checkRateLimit, rateLimitHeaders } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MAX_TOTAL_SIZE = 200 * 1024 * 1024;

function isPdfBytes(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString() === "%PDF-";
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rl = checkRateLimit(`merge-pdf:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length < 2) {
      return NextResponse.json(
        { error: "At least 2 files are required for merging" },
        { status: 400 },
      );
    }

    let totalSize = 0;
    for (const f of files) {
      totalSize += f.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        return NextResponse.json(
          { error: "Total file size exceeds 200MB limit" },
          { status: 413 },
        );
      }
    }

    const mergedPdf = await PDFDocument.create();
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = fileExtension(file.name);
      const treatAsPdf =
        ext === "pdf" ||
        file.type === "application/pdf" ||
        isPdfBytes(buffer);

      try {
        if (treatAsPdf) {
          const srcPdf = await PDFDocument.load(buffer, {
            ignoreEncryption: true,
            updateMetadata: false,
            throwOnInvalidObject: false,
          });
          const pages = await mergedPdf.copyPages(
            srcPdf,
            srcPdf.getPageIndices(),
          );
          pages.forEach((p) => mergedPdf.addPage(p));
        } else if (
          ["png", "jpg", "jpeg", "webp", "avif", "bmp", "gif", "tiff"].includes(
            ext,
          )
        ) {
          const pngBuf = await sharp(buffer, { failOn: "none" })
            .rotate()
            .png()
            .toBuffer();
          const { width: imgW, height: imgH } = await sharp(buffer).metadata();

          const image = await mergedPdf.embedPng(pngBuf);
          const margin = 40;
          const pageW = 595.28;
          const pageH = 841.89;
          const maxW = pageW - margin * 2;
          const maxH = pageH - margin * 2;

          let finalW = imgW || maxW;
          let finalH = imgH || maxH;
          const ratio = Math.min(maxW / finalW, maxH / finalH);
          if (ratio < 1) {
            finalW *= ratio;
            finalH *= ratio;
          }

          const page = mergedPdf.addPage([pageW, pageH]);
          page.drawImage(image, {
            x: (pageW - finalW) / 2,
            y: (pageH - finalH) / 2,
            width: finalW,
            height: finalH,
          });
        } else {
          const text = buffer
            .toString("utf-8")
            .replace(/[^\x00-\x7F]/g, "?")
            .slice(0, 50000);

          const fontSize = 10;
          const lineHeight = fontSize * 1.4;
          const margin = 50;
          const pageW = 595.28;
          const pageH = 841.89;
          const maxW = pageW - margin * 2;

          const titlePage = mergedPdf.addPage([pageW, pageH]);
          titlePage.drawText(file.name, {
            x: margin,
            y: pageH - margin,
            size: 14,
            font,
            color: rgb(0.15, 0.15, 0.15),
          });

          const lines: string[] = [];
          for (const para of text.split("\n")) {
            const words = para.split(/\s+/);
            let line = "";
            for (const word of words) {
              if (!word) continue;
              const test = line ? line + " " + word : word;
              if (font.widthOfTextAtSize(test, fontSize) > maxW && line) {
                lines.push(line);
                line = word;
              } else {
                line = test;
              }
            }
            if (line) lines.push(line);
            lines.push("");
          }

          let page = titlePage;
          let y = pageH - margin - 30;

          for (const line of lines) {
            if (y < margin + lineHeight) {
              page = mergedPdf.addPage([pageW, pageH]);
              y = pageH - margin;
            }
            if (line === "") {
              y -= lineHeight * 0.5;
              continue;
            }
            page.drawText(line, {
              x: margin,
              y,
              size: fontSize,
              font,
              color: rgb(0.1, 0.1, 0.1),
            });
            y -= lineHeight;
          }
        }
      } catch {
        const errPage = mergedPdf.addPage([595.28, 841.89]);
        errPage.drawText(`[Could not embed: ${file.name}]`, {
          x: 50,
          y: 750,
          size: 12,
          font,
          color: rgb(0.8, 0.2, 0.2),
        });
      }
    }

    const pdfBytes = await mergedPdf.save();
    const resultBuffer = Buffer.from(pdfBytes);

    const resp = new NextResponse(resultBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Original-Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cloudconverter.tech-merged-${Date.now()}.pdf"`,
        "Content-Length": String(resultBuffer.length),
        "X-Content-Type-Options": "nosniff",
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
