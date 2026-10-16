/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { convertFile } from "@/lib/converter";

/** Wrap raw ICNS elements into a valid container. */
function buildIcns(chunks: Array<[string, Buffer]>): Buffer {
  const parts: Buffer[] = [];
  let total = 8;
  for (const [type, payload] of chunks) {
    const head = Buffer.alloc(8);
    head.write(type, 0, 4, "ascii");
    head.writeUInt32BE(payload.length + 8, 4);
    parts.push(head, payload);
    total += payload.length + 8;
  }
  const out = Buffer.alloc(total);
  out.write("icns", 0, 4, "ascii");
  out.writeUInt32BE(total, 4);
  let pos = 8;
  for (const p of parts) {
    p.copy(out, pos);
    pos += p.length;
  }
  return out;
}

/**
 * ic05 holds 32x32 24-bit RGB stored bottom-up, with rows padded to an even
 * byte count. l8mk is its 8-bit alpha mask, where 0 is opaque.
 */
function rawRgbChunk(width: number, height: number, rgb: [number, number, number]): Buffer {
  const stride = Math.ceil((width * 3) / 2) * 2;
  const buf = Buffer.alloc(stride * height);
  for (let srcRow = 0; srcRow < height; srcRow++) {
    for (let x = 0; x < width; x++) {
      const o = srcRow * stride + x * 3;
      buf[o] = rgb[0];
      buf[o + 1] = rgb[1];
      buf[o + 2] = rgb[2];
    }
  }
  return buf;
}

function rawMaskChunk(width: number, height: number, value: number): Buffer {
  const stride = Math.ceil(width / 2) * 2;
  return Buffer.alloc(stride * height, value);
}

/**
 * The reported failure was "ICNS contains no decodable image" for valid icons.
 * The decoder only accepted payloads with a PNG/JPEG/JP2 magic number, so an
 * icon whose only element is raw RGB data had nothing to match.
 */
describe("ICNS raw element decoding", () => {
  it("decodes an icon stored as raw 24-bit RGB", async () => {
    const file = buildIcns([["ic05", rawRgbChunk(32, 32, [200, 40, 90])]]);

    const png = await convertFile(file, "icns", "png", 85, null, null);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");

    const sharp = (await import("sharp")).default;
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);

    const { data } = await sharp(png)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([200, 40, 90]);
  });

  it("applies the 8-bit mask element as alpha", async () => {
    const opaque = buildIcns([
      ["ic05", rawRgbChunk(32, 32, [10, 20, 30])],
      ["l8mk", rawMaskChunk(32, 32, 0x00)],
    ]);
    const transparent = buildIcns([
      ["ic05", rawRgbChunk(32, 32, [10, 20, 30])],
      ["l8mk", rawMaskChunk(32, 32, 0xff)],
    ]);

    const sharp = (await import("sharp")).default;
    const a = await sharp(
      await convertFile(opaque, "icns", "png", 85, null, null),
    )
      .ensureAlpha()
      .raw()
      .toBuffer();
    const b = await sharp(
      await convertFile(transparent, "icns", "png", 85, null, null),
    )
      .ensureAlpha()
      .raw()
      .toBuffer();

    expect(a[3]).toBe(255);
    expect(b[3]).toBe(0);
  });

  it("still prefers the largest embedded image over a raw element", async () => {
    const sharp = (await import("sharp")).default;
    const bigPng = await sharp({
      create: { width: 128, height: 128, channels: 4, background: { r: 5, g: 6, b: 7, alpha: 1 } },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();

    const file = buildIcns([
      ["icp5", rawRgbChunk(32, 32, [1, 1, 1])],
      ["ic13", bigPng],
    ]);

    const meta = await sharp(
      await convertFile(file, "icns", "png", 85, null, null),
    ).metadata();
    expect(meta.width).toBe(128);
  });
});