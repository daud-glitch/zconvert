/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { convertFile } from "@/lib/converter";

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