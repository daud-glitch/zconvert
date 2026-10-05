/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { convertFile } from "@/lib/converter";

const FIX = path.join(__dirname, "fixtures");
const read = (name: string) => fs.readFileSync(path.join(FIX, name));

/**
 * Production reported "Input buffer has corrupt header: VipsJpeg: premature
 * end of JPEG image" for mpo → jpg. Frame extraction searched for the first
 * FFD8…FFD9 byte pair, which stops at the FFD8…FFD9 of an EXIF thumbnail or of
 * the binary MPF index and hands libjpeg a truncated segment list.
 */
describe("MPO decoding", () => {
  it("reads the primary frame of a two-frame MPO", async () => {
    const out = await convertFile(read("mpo_two_frame.mpo"), "mpo", "jpg", 90, null, null);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(120);
    expect(meta.height).toBe(90);
  });

  it("is not truncated by an EXIF thumbnail in the primary image", async () => {
    const out = await convertFile(read("mpo_exif_thumb.mpo"), "mpo", "jpg", 90, null, null);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(120);
    expect(meta.height).toBe(90);
    // The thumbnail is 16x12; picking it would mean the thumbnail was used.
    expect(meta.width).not.toBe(16);
  });

  it("handles a single-frame .mpo that only has a thumbnail", async () => {
    const out = await convertFile(read("mpo_thumb_only.mpo"), "mpo", "jpg", 90, null, null);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(120);
  });

  it("still converts to png", async () => {
    const out = await convertFile(read("mpo_exif_thumb.mpo"), "mpo", "png", 90, null, null);
    expect(out.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("reports a clear error for a file with no complete frame", async () => {
    await expect(
      convertFile(Buffer.from("not an mpo at all"), "mpo", "jpg", 90, null, null),
    ).rejects.toThrow(/MPO|no complete JPEG|cannot decode/i);
  });
});