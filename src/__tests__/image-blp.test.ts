/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { convertFile } from "@/lib/converter";

function makeBlp2Palette(width: number, height: number): Buffer {
  const headerSize = 148;
  const palSize = 1024;
  const pixels = width * height;
  const buf = Buffer.alloc(headerSize + palSize + pixels);
  buf.write("BLP2", 0);
  buf.writeUInt32LE(1, 4);
  buf.writeUInt8(1, 8);
  buf.writeUInt8(0, 9);
  buf.writeUInt8(0, 10);
  buf.writeUInt8(0, 11);
  buf.writeUInt32LE(width, 12);
  buf.writeUInt32LE(height, 16);
  const mipOff = headerSize + palSize;
  buf.writeUInt32LE(mipOff, 0x14);
  buf.writeUInt32LE(pixels, 0x54);
  buf[headerSize] = 40;
  buf[headerSize + 1] = 80;
  buf[headerSize + 2] = 200;
  buf[headerSize + 3] = 255;
  return buf;
}

function makeBlp2Dxt1(width: number, height: number): Buffer {
  const headerSize = 148;
  const blocks = Math.ceil(width / 4) * Math.ceil(height / 4);
  const dataSize = blocks * 8;
  const buf = Buffer.alloc(headerSize + dataSize);
  buf.write("BLP2", 0);
  buf.writeUInt32LE(1, 4);
  buf.writeUInt8(2, 8);
  buf.writeUInt8(0, 9);
  buf.writeUInt8(0, 10);
  buf.writeUInt8(0, 11);
  buf.writeUInt32LE(width, 12);
  buf.writeUInt32LE(height, 16);
  buf.writeUInt32LE(headerSize, 0x14);
  buf.writeUInt32LE(dataSize, 0x54);
  for (let i = 0; i < blocks; i++) {
    const o = headerSize + i * 8;
    buf.writeUInt16LE(0xf800, o);
    buf.writeUInt16LE(0xf800, o + 2);
    buf.writeUInt32LE(0, o + 4);
  }
  return buf;
}

describe("BLP conversion", () => {
  it("converts palettized BLP2 (mip2 offset 0) to PNG and BMP", async () => {
    const blp = makeBlp2Palette(8, 4);
    expect(blp.readUInt32LE(28)).toBe(0);

    const png = await convertFile(blp, "blp", "png");
    const pngMeta = await sharp(png).metadata();
    expect(pngMeta.format).toBe("png");
    expect(pngMeta.width).toBe(8);
    expect(pngMeta.height).toBe(4);

    const bmp = await convertFile(blp, "blp", "bmp");
    expect(bmp.toString("ascii", 0, 2)).toBe("BM");
    expect(bmp.length).toBeGreaterThan(54);
  }, 30_000);

  it("converts DXT1 BLP2 to AVIF", async () => {
    const blp = makeBlp2Dxt1(4, 4);
    const out = await convertFile(blp, "blp", "avif");
    const meta = await sharp(out).metadata();
    expect(["avif", "heif"]).toContain(meta.format);
    expect(meta.width).toBe(4);
    expect(meta.height).toBe(4);
  }, 30_000);
});
