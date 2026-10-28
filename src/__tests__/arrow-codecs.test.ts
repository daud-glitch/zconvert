/**
 * @vitest-environment node
 *
 * `feather -> xlsx` failed 100% with "Record batch is compressed but codec not
 * found": apache-arrow ships the compression registry but no codecs, and
 * pyarrow/pandas write lz4- or zstd-compressed bodies whenever compression is
 * requested.
 *
 * The LZ4 fixtures below are hand-built to the frame/block specification, so a
 * passing test means the decoder agrees with the format and not merely with
 * itself.
 */
import { describe, expect, it } from "vitest";
import * as zlib from "node:zlib";
import * as arrow from "apache-arrow";
import { decodeLz4Block, decodeLz4Frame } from "@/lib/arrow-codecs";
import { readFeatherRecords } from "@/lib/format-readers";

const zstdAvailable =
  typeof (zlib as unknown as { zstdDecompressSync?: unknown })
    .zstdDecompressSync === "function";

describe("LZ4 block decoder", () => {
  it("expands a literal followed by an overlapping match", () => {
    // token 0x15: one literal, match length (5 + 4) = 9, offset 1 → "a" x 10.
    const block = Uint8Array.from([0x15, 0x61, 0x01, 0x00]);
    expect(Buffer.from(decodeLz4Block(block)).toString()).toBe("a".repeat(10));
  });

  it("handles a run of literals only", () => {
    const block = Uint8Array.from([0x30, 0x61, 0x62, 0x63]); // 3 literals, no match
    expect(Buffer.from(decodeLz4Block(block)).toString()).toBe("abc");
  });

  it("rejects a match that reaches before the output start", () => {
    const block = Uint8Array.from([0x10, 0x61, 0x05, 0x00]); // offset 5, only 1 byte out
    expect(() => decodeLz4Block(block)).toThrow(/offset/);
  });
});

describe("LZ4 frame decoder", () => {
  it("decompresses a frame with a compressed block and an EndMark", () => {
    const frame = Uint8Array.from([
      0x04, 0x22, 0x4d, 0x18, // magic 0x184D2204
      0x60, // FLG: version 1, independent blocks
      0x70, // BD: 4 MB maximum block size
      0x00, // header checksum (bounds are what we validate)
      0x04, 0x00, 0x00, 0x00, // block size 4, compressed
      0x15, 0x61, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x00, // EndMark
    ]);
    expect(Buffer.from(decodeLz4Frame(frame)).toString()).toBe("a".repeat(10));
  });

  it("passes through a block stored uncompressed", () => {
    const frame = Uint8Array.from([
      0x04, 0x22, 0x4d, 0x18,
      0x60,
      0x70,
      0x00,
      0x04, 0x00, 0x00, 0x80, // size 4 with the "stored" high bit set
      0x61, 0x62, 0x63, 0x64,
      0x00, 0x00, 0x00, 0x00,
    ]);
    expect(Buffer.from(decodeLz4Frame(frame)).toString()).toBe("abcd");
  });

  it("rejects data that is not an LZ4 frame", () => {
    expect(() => decodeLz4Frame(Uint8Array.from([1, 2, 3, 4, 5, 6, 7]))).toThrow(
      /LZ4/,
    );
  });
});

describe("compressed Feather files", () => {
  it.runIf(zstdAvailable)(
    "reads a ZSTD-compressed record batch end to end",
    async () => {
      const table = arrow.tableFromArrays({
        n: [1, 2, 3],
        s: ["alpha", "beta", "gamma"],
      });

      // The writer needs an encoder. Registering it here (and clearing it
      // after) also proves the read path registers the decode-only codec
      // itself, rather than relying on what the test left behind.
      arrow.compressionRegistry.set(arrow.CompressionType.ZSTD, {
        encode: (input: Uint8Array) =>
          new Uint8Array(
            (
              zlib as unknown as {
                zstdCompressSync: (buf: Uint8Array) => Buffer;
              }
            ).zstdCompressSync(input),
          ),
      });

      const writer = arrow.RecordBatchFileWriter.writeAll(table, {
        compressionType: arrow.CompressionType.ZSTD,
      });
      const bytes = writer.toUint8Array(true);
      arrow.compressionRegistry.set(arrow.CompressionType.ZSTD, null as never);

      const rows = await readFeatherRecords(Buffer.from(bytes));
      expect(rows).toEqual([
        { n: 1, s: "alpha" },
        { n: 2, s: "beta" },
        { n: 3, s: "gamma" },
      ]);
    },
  );
});
