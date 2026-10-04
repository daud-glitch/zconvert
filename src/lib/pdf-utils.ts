import { readFile } from "fs/promises";
import { join } from "path";
import JSZip from "jszip";

export type { PdfRasterConvertResult } from "./pdf-raster-targets";
export { isPdfRasterTarget, PDF_RASTER_TARGETS } from "./pdf-raster-targets";
import type { PdfRasterConvertResult } from "./pdf-raster-targets";
import { createPdfParser } from "./pdf-parse-node";

async function loadSharp() {
  return (await import("sharp")).default;
}

let cachedFontBytes: Uint8Array | null = null;

/** Load a Unicode-capable TTF for pdf-lib text rendering. */
export async function loadPdfUnicodeFontBytes(): Promise<Uint8Array> {
  if (cachedFontBytes) return cachedFontBytes;

  const candidates = [
    join(/* turbopackIgnore: true */ process.cwd(), "assets", "fonts", "NotoSans-Regular.ttf"),
    join(/* turbopackIgnore: true */ process.cwd(), "assets", "fonts", "DejaVuSans.ttf"),
  ];
  if (process.platform === "win32") {
    const winDir = process.env.WINDIR || "C:\\Windows";
    candidates.push(join(winDir, "Fonts", "arial.ttf"));
    candidates.push(join(winDir, "Fonts", "segoeui.ttf"));
  }

  for (const p of candidates) {
    try {
      const bytes = await readFile(p);
      cachedFontBytes = new Uint8Array(bytes);
      return cachedFontBytes;
    } catch {
      // try next path
    }
  }

  throw new Error(
    "No Unicode font found for PDF generation. Add assets/fonts/NotoSans-Regular.ttf",
  );
}

/** Extract plain text from a PDF buffer (pdf-parse v2). */
export async function extractPdfText(input: Buffer): Promise<string> {
  const parser = await createPdfParser(input);
  try {
    const result = await parser.getText();
    const text = result.text?.trim();
    return text || "[PDF with no text content]";
  } catch (err) {
    console.error("PDF text extraction error:", err);
    return "[Error extracting PDF content]";
  } finally {
    await parser.destroy().catch(() => {});
  }
}

export interface PdfPageImage {
  pageNumber: number;
  data: Buffer;
}

/** Render PDF pages to PNG buffers via pdf-parse screenshots. */
export async function renderPdfPageImages(
  input: Buffer,
  options?: { scale?: number; pageNumbers?: number[] },
): Promise<PdfPageImage[]> {
  const parser = await createPdfParser(input);
  try {
    const params: { scale?: number; partial?: number[]; imageBuffer?: boolean; imageDataUrl?: boolean } = {
      scale: options?.scale ?? 2,
      imageBuffer: true,
      imageDataUrl: false,
    };
    if (options?.pageNumbers?.length) {
      params.partial = options.pageNumbers;
    }

    const result = await parser.getScreenshot(params);
    return result.pages
      .filter((p) => p.data && p.data.byteLength > 0)
      .map((p) => ({
        pageNumber: p.pageNumber,
        data: Buffer.from(p.data),
      }));
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/** Convert a PNG buffer (from PDF render) to the target image format. */
export async function convertRenderedPng(
  pngBuf: Buffer,
  outputExt: string,
  quality: number = 85,
): Promise<Buffer> {
  const normalized = outputExt.toLowerCase();
  // JFIF is the JPEG container under another extension — without this it fell
  // through to `default` and shipped PNG bytes inside a .jfif download.
  const dest = normalized === "jpeg" || normalized === "jfif" ? "jpg" : normalized;
  const sharp = await loadSharp();
  const pipeline = sharp(pngBuf);

  switch (dest) {
    case "png":
      return pipeline.png().toBuffer();
    case "jpg":
      return pipeline.jpeg({ quality }).toBuffer();
    case "webp":
      return pipeline.webp({ quality }).toBuffer();
    case "gif":
      return pipeline.gif().toBuffer();
    case "tiff":
      return pipeline.tiff().toBuffer();
    case "bmp":
      return pipeline.bmp().toBuffer();
    case "avif":
      return pipeline.avif({ quality }).toBuffer();
    case "ico": {
      const { data, info } = await pipeline
        .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .raw()
        .toBuffer({ resolveWithObject: true });
      return encodeIcoFromRgba(data, info.width, info.height);
    }
    default:
      throw new Error(
        `PDF pages cannot be rendered as .${normalized.toUpperCase()}. Choose PNG, JPG, WebP, GIF, BMP, TIFF, AVIF or ICO.`,
      );
  }
}

function encodeIcoFromRgba(data: Buffer, width: number, height: number): Buffer {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const dibSize = 40 + pixelDataSize;
  const bmp = Buffer.alloc(14 + dibSize);
  bmp.write("BM", 0);
  bmp.writeUInt32LE(14 + dibSize, 2);
  bmp.writeUInt32LE(14 + 40, 10);
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(width, 18);
  bmp.writeInt32LE(height, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.writeUInt32LE(pixelDataSize, 34);
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 4;
      const dstIdx = 14 + 40 + y * rowSize + x * 3;
      bmp[dstIdx] = data[srcIdx + 2];
      bmp[dstIdx + 1] = data[srcIdx + 1];
      bmp[dstIdx + 2] = data[srcIdx];
    }
  }
  const headerSize = 6;
  const dirEntrySize = 16;
  const bmpOffset = headerSize + dirEntrySize;
  const ico = Buffer.alloc(bmpOffset + bmp.length - 14);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico.writeUInt8(width >= 256 ? 0 : width, 6);
  ico.writeUInt8(height >= 256 ? 0 : height, 7);
  ico.writeUInt8(0, 8);
  ico.writeUInt8(0, 9);
  ico.writeUInt16LE(1, 10);
  ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(bmp.length - 14, 14);
  ico.writeUInt32LE(bmpOffset, 18);
  bmp.copy(ico, bmpOffset, 14);
  return ico;
}

/** Render first PDF page to target image format. */
export async function convertPdfToImage(
  input: Buffer,
  outputExt: string,
  quality: number = 85,
): Promise<Buffer> {
  const pages = await renderPdfPageImages(input, { scale: 2, pageNumbers: [1] });
  if (pages.length === 0) {
    throw new Error("Failed to render PDF page as image");
  }
  return convertRenderedPng(pages[0].data, outputExt, quality);
}

/** Pack rendered PDF page PNGs into a ZIP of target-format images. */
export async function zipPdfPageImages(
  pages: PdfPageImage[],
  targetFormat: string,
  quality: number,
  baseName: string,
): Promise<Buffer> {
  const zip = new JSZip();
  const ext =
    targetFormat === "jpg" || targetFormat === "jpeg" || targetFormat === "jfif"
      ? "jpg"
      : targetFormat;

  for (const page of pages) {
    const pageName = `${baseName}-page-${String(page.pageNumber).padStart(3, "0")}`;
    try {
      const imageBuf = await convertRenderedPng(page.data, targetFormat, quality);
      zip.file(`${pageName}.${ext}`, imageBuf);
    } catch {
      zip.file(`${pageName}.png`, page.data);
    }
  }

  return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
}

/** Build a ZIP of per-page images from a PDF (shared by convert + pdf-split APIs). */
export async function buildPdfPageImagesZip(
  input: Buffer,
  targetFormat: string,
  quality: number,
  baseName: string,
): Promise<{ zip: Buffer; pageCount: number }> {
  const pages = await renderPdfPageImages(input, { scale: 2 });
  if (pages.length === 0) {
    throw new Error("PDF has no pages");
  }
  const zip = await zipPdfPageImages(pages, targetFormat, quality, baseName);
  return { zip, pageCount: pages.length };
}

/**
 * Convert PDF to a raster image. Multi-page PDFs return a ZIP of one image per page.
 */
export async function convertPdfToRasterOutput(
  input: Buffer,
  outputExt: string,
  quality: number = 85,
  baseName: string = "document",
): Promise<PdfRasterConvertResult> {
  const pages = await renderPdfPageImages(input, { scale: 2 });
  if (pages.length === 0) {
    throw new Error("Failed to render PDF pages as images");
  }

  if (pages.length === 1) {
    return {
      type: "single",
      data: await convertRenderedPng(pages[0].data, outputExt, quality),
    };
  }

  const zip = await zipPdfPageImages(pages, outputExt, quality, baseName);
  return { type: "zip", data: zip, pageCount: pages.length };
}
