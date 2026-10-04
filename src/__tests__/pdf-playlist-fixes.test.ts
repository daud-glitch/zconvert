import { describe, expect, it } from "vitest";
import { PDFDocument, rgb } from "pdf-lib";
import { convertFile } from "@/lib/converter";
import { convertRenderedPng } from "@/lib/pdf-utils";
import { decodeImageToPng } from "@/lib/image-decode";

async function onePagePdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 260,
    height: 260,
    color: rgb(0.2, 0.5, 0.9),
  });
  return Buffer.from(await doc.save());
}

// PDF rasterisation costs ~1.5s per call on its own and the default 5s budget
// is not enough once the whole suite runs in parallel.
const RASTER_TIMEOUT = 30_000;

describe("PDF → JFIF", () => {
  it("emits JPEG bytes, not PNG bytes wearing a .jfif name", async () => {
    const pdf = await onePagePdf();
    const out = await convertFile(pdf, "pdf", "jfif");
    // JPEG SOI marker — previously the same size as PNG output.
    expect(out.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  }, RASTER_TIMEOUT);

  it("matches the jpg output size", async () => {
    const pdf = await onePagePdf();
    const [jpg, jfif] = await Promise.all([
      convertFile(pdf, "pdf", "jpg"),
      convertFile(pdf, "pdf", "jfif"),
    ]);
    expect(Math.abs(jpg.length - jfif.length)).toBeLessThan(200);
  }, RASTER_TIMEOUT);

  it("rejects unknown raster targets instead of silently returning PNG", async () => {
    const png = await convertFile(await onePagePdf(), "pdf", "png");
    await expect(convertRenderedPng(png, "xyz")).rejects.toThrow(
      /cannot be rendered/i,
    );
  }, RASTER_TIMEOUT);
});

describe("text → PDF font weight", () => {
  it("drops the embedded font for ASCII text", async () => {
    const { textToPdf } = await import("@/lib/converter");
    const small = await textToPdf("a,b\n1,2\n");
    const large = await textToPdf("a,b\n".repeat(400) + "1,2\n");
    // Was ~570 KB regardless of content; now scales with the text.
    expect(small.length).toBeLessThan(5_000);
    expect(large.length).toBeGreaterThan(small.length);
  });
});

describe("BLP2 uncompressed BGRA", () => {
  /** Minimal BLP2, type 7 (uncompressed BGRA) — the documented variant. */
  function blp2Uncompressed() {
    const width = 4,
      height = 4;
    const buf = Buffer.alloc(0x94 + width * height * 4);
    buf.write("BLP2", 0, "ascii");
    buf.writeUInt32LE(7, 4); // type 7 = uncompressed BGRA
    buf.writeUInt8(0, 8); // encoding 0 = uncompressed
    buf.writeUInt8(8, 9); // alphaDepth
    buf.writeUInt32LE(width, 12);
    buf.writeUInt32LE(height, 16);
    buf.writeUInt32LE(0x94, 0x14); // mipmap offset
    buf.writeUInt32LE(width * height * 4, 0x54); // mipmap length
    for (let i = 0; i < width * height; i++) {
      const o = 0x94 + i * 4;
      buf.writeUInt8(200, o); // B
      buf.writeUInt8(100, o + 1); // G
      buf.writeUInt8(50, o + 2); // R
      buf.writeUInt8(255, o + 3); // A
    }
    return buf;
  }

  it("decodes instead of throwing 'encoding not supported'", async () => {
    const png = await decodeImageToPng(blp2Uncompressed(), "blp");
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("converts to a real image target", async () => {
    const out = await convertFile(blp2Uncompressed(), "blp", "avif");
    expect(out.length).toBeGreaterThan(0);
  });
});