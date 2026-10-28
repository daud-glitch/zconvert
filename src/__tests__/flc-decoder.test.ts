/**
 * `flc -> jpg` / `fli -> *` failed on every upload with
 * "Input image exceeds pixel limit" (a libvips message, not ours).
 *
 * The reader took width/height from an unvalidated header, then read the frame
 * header six bytes early — so it allocated whatever `chunkSize` implied and
 * libvips refused it. Palette indexes were also written straight into R/G/B,
 * so even a successful decode would have been a grey smear.
 *
 * Fixtures here are built to the FLIC layout FFmpeg's decoder implements:
 * 128-byte file header, frames of size(4) magic(2) chunks(2) padding(8), then
 * 6-byte chunk headers, 8-bit palette chunks and BRUN/LC pixel chunks.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { decodeImageToPng } from "@/lib/image-decode";
import { convertFile } from "@/lib/converter";

const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];
const WHITE = [255, 255, 255];

function u16(value: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(value);
  return b;
}

function u32(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(value);
  return b;
}

function chunk(type: number, data: Buffer): Buffer {
  return Buffer.concat([u32(6 + data.length), u16(type), data]);
}

/** FLI_256_COLOR with four 8-bit entries: index 0..3. */
function paletteChunk(): Buffer {
  const colors = Buffer.from([...RED, ...GREEN, ...BLUE, ...WHITE]);
  return chunk(4, Buffer.concat([u16(1), Buffer.from([0, 4]), colors]));
}

/** FLI_BRUN, one run per line covering the full width. */
function brunChunk(indexPerRow: number[], width: number): Buffer {
  const bytes: number[] = [];
  for (const index of indexPerRow) bytes.push(1, width, index);
  return chunk(15, Buffer.from(bytes));
}

/** FLI_LC from line 0, one repeat packet per line. */
function lcChunk(indexPerRow: number[], width: number): Buffer {
  const bytes: number[] = [0, 0, 0, indexPerRow.length]; // startLine, lineCount
  for (const index of indexPerRow) bytes.push(1, 0, 256 - width, index);
  return chunk(12, Buffer.from(bytes));
}

function flcFile(options: {
  width?: number;
  height?: number;
  magic?: number;
  depth?: number;
  pixelChunk?: "brun" | "lc";
}): Buffer {
  const width = options.width ?? 4;
  const height = options.height ?? 4;
  const rows = [0, 1, 2, 3].slice(0, height);
  const pixels =
    options.pixelChunk === "lc"
      ? lcChunk(rows, width)
      : brunChunk(rows, width);
  const frameBody = Buffer.concat([paletteChunk(), pixels]);
  const frame = Buffer.concat([
    u32(16 + frameBody.length),
    u16(0xf1fa),
    u16(2),
    Buffer.alloc(8),
    frameBody,
  ]);

  const header = Buffer.alloc(128);
  header.writeUInt32LE(128 + frame.length, 0);
  header.writeUInt16LE(options.magic ?? 0xaf12, 4);
  header.writeUInt16LE(1, 6);
  header.writeUInt16LE(width, 8);
  header.writeUInt16LE(height, 10);
  header.writeUInt16LE(options.depth ?? 8, 12);
  return Buffer.concat([header, frame]);
}

async function pixelsOf(png: Buffer) {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const o = (y * info.width + x) * info.channels;
    return [data[o], data[o + 1], data[o + 2]];
  };
  return { info, at };
}

describe("FLI/FLC first frame", () => {
  it("decodes a BRUN first frame into its palette colours", async () => {
    const png = await decodeImageToPng(flcFile({}), "flc");
    const { info, at } = await pixelsOf(png);

    expect(info.width).toBe(4);
    expect(info.height).toBe(4);
    expect(at(0, 0)).toEqual(RED);
    expect(at(3, 0)).toEqual(RED);
    expect(at(0, 1)).toEqual(GREEN);
    expect(at(0, 2)).toEqual(BLUE);
    expect(at(0, 3)).toEqual(WHITE);
  });

  it("decodes an LC first frame", async () => {
    const png = await decodeImageToPng(flcFile({ pixelChunk: "lc" }), "fli");
    const { at } = await pixelsOf(png);
    expect(at(0, 0)).toEqual(RED);
    expect(at(0, 1)).toEqual(GREEN);
    expect(at(0, 2)).toEqual(BLUE);
    expect(at(0, 3)).toEqual(WHITE);
  });

  it("accepts the FLI magic as well as FLC", async () => {
    const png = await decodeImageToPng(flcFile({ magic: 0xaf11 }), "flc");
    const { at } = await pixelsOf(png);
    expect(at(0, 0)).toEqual(RED);
  });

  it("names the format when the signature is missing", async () => {
    // A renamed file used to reach libvips and fail with its pixel-limit text.
    const notFlic = Buffer.alloc(256, 0x41);
    await expect(decodeImageToPng(notFlic, "flc")).rejects.toThrow(
      /AF11\/AF12 file signature is missing/,
    );
  });

  it("rejects an implausible header instead of allocating it", async () => {
    const bomb = flcFile({});
    bomb.writeUInt16LE(60000, 8);
    bomb.writeUInt16LE(60000, 10);

    await expect(decodeImageToPng(bomb, "flc")).rejects.toThrow(
      /implausible 60000x60000 frame/,
    );
  });

  it("explains that only 8-bit animations can be rasterised", async () => {
    await expect(decodeImageToPng(flcFile({ depth: 24 }), "flc")).rejects.toThrow(
      /24-bit pixels is not supported/,
    );
  });

  // The pair that failed in production, through the real conversion entry point.
  it("converts flc -> jpg", async () => {
    const out = await convertFile(flcFile({}), "flc", "jpg");
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
  });

  it("converts flc -> svg", async () => {
    const out = await convertFile(flcFile({}), "flc", "svg");
    expect(out.toString()).toContain("<svg");
  });
});
