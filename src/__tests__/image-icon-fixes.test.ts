/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { convertFile } from "@/lib/converter";
import { humanizeConversionError } from "@/lib/upload-limits";

const FIX = path.join(__dirname, "fixtures");
const read = (name: string) => fs.readFileSync(path.join(FIX, name));

/**
 * Both failures here came from the failed-conversion export.
 *
 * ICNS was worse than a failure: a chunk with a zero length left the cursor
 * where it was, so decodeIcns looped forever. Five concurrent uploads would
 * have exhausted every web-dyno convert slot.
 */
describe("ICNS decoding", () => {
  it("terminates on a malformed chunk instead of hanging", async () => {
    const started = Date.now();
    await expect(
      convertFile(read("icns_bad.icns"), "icns", "png", 85, null, null),
    ).rejects.toThrow(/no image data|no decodable/i);

    // The bug was an unbounded loop, so assert on elapsed time too.
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("reads a PNG payload", async () => {
    const out = await convertFile(read("icns_png.icns"), "icns", "png", 85, null, null);
    expect(out.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("reads a JPEG payload, which real macOS icons use", async () => {
    // Production reported "ICNS has no embedded PNG" for these: only PNG
    // payloads were considered, and ic07/ic08 icons carry JPEG.
    const out = await convertFile(read("icns_jpeg.icns"), "icns", "png", 85, null, null);
    expect(out.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("picks the largest entry when several are present", async () => {
    const one = await convertFile(read("icns_jpeg.icns"), "icns", "png", 85, null, null);
    const two = await convertFile(read("icns_two.icns"), "icns", "png", 85, null, null);
    expect(two.length).toBeGreaterThan(one.length);
  });

  it("converts to svg as well as png", async () => {
    const out = await convertFile(read("icns_jpeg.icns"), "icns", "svg", 85, null, null);
    expect(out.toString("utf8", 0, 200)).toContain("<svg");
  });

  it("finds the payload when an element length is corrupt", async () => {
    const sharp = (await import("sharp")).default;
    const png = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 10, g: 120, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const header = Buffer.alloc(8);
    header.write("icns", 0, "ascii");
    header.writeUInt32BE(header.length + 8 + png.length, 4);
    const chunk = Buffer.alloc(8);
    chunk.write("ic07", 0, "ascii");
    chunk.writeUInt32BE(8, 4); // declares an empty payload

    const icon = Buffer.concat([header, chunk, png]);
    const out = await convertFile(icon, "icns", "png", 85, null, null);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(32);
  });
});

describe("EPS decoding", () => {
  const vectorOnly = Buffer.from(
    "%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 10 10\n0 0 moveto 10 10 lineto stroke\nshowpage\n",
    "latin1",
  );

  /** The conversion is expected to fail, so return the thrown error. */
  async function conversionError(): Promise<Error> {
    try {
      await convertFile(vectorOnly, "eps", "svg", 85, null, null);
    } catch (e) {
      return e as Error;
    }
    throw new Error("expected a vector-only EPS to fail");
  }

  it("reads the TIFF preview behind a DOS EPS binary header", async () => {
    const sharp = (await import("sharp")).default;
    const ps = Buffer.from(
      "%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 16 16\nshowpage\n",
      "latin1",
    );
    const tiff = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .tiff()
      .toBuffer();

    const header = Buffer.alloc(30);
    header.writeUInt32BE(0xc5d0d3c6, 0);
    header.writeUInt32LE(header.length, 4);
    header.writeUInt32LE(ps.length, 8);
    header.writeUInt32LE(0, 12);
    header.writeUInt32LE(0, 16);
    header.writeUInt32LE(header.length + ps.length, 20);
    header.writeUInt32LE(tiff.length, 24);

    const eps = Buffer.concat([header, ps, tiff]);
    const png = await convertFile(eps, "eps", "png", 85, null, null);
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(16);
    expect(meta.height).toBe(16);

    const svg = await convertFile(eps, "eps", "svg", 85, null, null);
    expect(svg.toString("utf8", 0, 200)).toContain("<svg");
  });

  it("decodes a hex %%BeginPreview bitmap", async () => {
    const sharp = (await import("sharp")).default;
    const rows: string[] = [];
    for (let y = 0; y < 16; y++) rows.push(y < 8 ? "ffff" : "0000");

    const eps = Buffer.from(
      [
        "%!PS-Adobe-3.0 EPSF-3.0",
        "%%BoundingBox: 0 0 16 16",
        "%%BeginPreview: 16 16 1 16",
        ...rows,
        "%%EndPreview",
        "showpage",
      ].join("\n"),
      "latin1",
    );

    const png = await convertFile(eps, "eps", "png", 85, null, null);
    const { data, info } = await sharp(png)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(16);
    expect(info.height).toBe(16);
    expect(data[0]).toBe(0); // ink row
    const bottomRow = 15 * info.width * info.channels;
    expect(data[bottomRow]).toBe(255);
  });

  it("explains vector-only EPS instead of blaming a missing toolkit", async () => {
    const err = await conversionError();
    expect(err.message).toMatch(/PostScript/i);
    expect(err.message).toMatch(/preview/i);
    expect(err.message).not.toMatch(/please report/i);
  });

  it("keeps the EPS fix visible in the user-facing message", async () => {
    const err = await conversionError();
    const message = humanizeConversionError(err.message);
    expect(message).toMatch(/EPS/);
    // The generic tail truncates at 180 characters, which used to cut off the
    // "export it as SVG or PDF" advice.
    expect(message).not.toContain("…");
  });
});

describe("ICO decoding", () => {
  it("decodes a standard BMP-based icon", async () => {
    // An .ico payload is a bare BITMAPINFOHEADER with no "BM" signature, so
    // routing it through the .BMP reader failed every time with
    // "Invalid BMP data in icon".
    for (const dest of ["png", "jpg", "svg", "avif"]) {
      const out = await convertFile(read("ico_bmp32.ico"), "ico", dest, 85, null, null);
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it("renders at the icon's real height, not double", async () => {
    const sharp = (await import("sharp")).default;
    const png = await convertFile(read("ico_bmp32.ico"), "ico", "png", 85, null, null);
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(32);
    // The stored height covers colour bits + AND mask.
    expect(meta.height).toBe(32);
  });
});