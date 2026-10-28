/**
 * Compression codecs for Arrow IPC ("Feather") record-batch bodies.
 *
 * `apache-arrow` ships the compression *registry* but no codecs, so any Feather
 * file written with `compression="lz4"` or `"zstd"` (what pandas/pyarrow do by
 * default when asked for compression) failed with
 * `Record batch is compressed but codec not found` — an error naming neither
 * the file nor the fix.
 *
 * LZ4 frame format: https://github.com/lz4/lz4/blob/dev/doc/lz4_Frame_format.md
 * Arrow compresses each body buffer on its own, prefixing the original length,
 * and hands us the payload without that prefix.
 */
import * as zlib from "node:zlib";

/** One Arrow compression codec: `decode` is required, `encode` is optional. */
export type ArrowCodec = {
  decode: (compressed: Uint8Array) => Uint8Array;
  encode?: (uncompressed: Uint8Array) => Uint8Array;
};

const LZ4_FRAME_MAGIC = 0x184d2204;

/** Growable output buffer; LZ4 does not record the decompressed length. */
class ByteSink {
  private buf: Uint8Array;
  length = 0;

  constructor(initial = 64) {
    this.buf = new Uint8Array(initial);
  }

  private ensure(extra: number): void {
    const needed = this.length + extra;
    if (needed <= this.buf.length) return;
    let cap = this.buf.length || 64;
    while (cap < needed) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.length));
    this.buf = next;
  }

  push(src: Uint8Array): void {
    this.ensure(src.length);
    this.buf.set(src, this.length);
    this.length += src.length;
  }

  /** Append one byte, used by the LZ4 match copy (overlap matters). */
  pushByte(value: number): void {
    this.ensure(1);
    this.buf[this.length++] = value;
  }

  copyMatch(offset: number, count: number): void {
    if (offset <= 0 || offset > this.length) {
      throw new Error("LZ4 match offset points outside the decompressed data");
    }
    this.ensure(count);
    let from = this.length - offset;
    // Bytewise on purpose: an LZ4 match may overlap its own output.
    for (let i = 0; i < count; i++) this.buf[this.length++] = this.buf[from++];
  }

  byteAt(index: number): number {
    return this.buf[index];
  }

  result(): Uint8Array {
    return this.buf.slice(0, this.length);
  }
}

function readExtendedLength(block: Uint8Array, cursor: { p: number }): number {
  let total = 0;
  for (;;) {
    if (cursor.p >= block.length) {
      throw new Error("LZ4 block ended inside a length field");
    }
    const byte = block[cursor.p++];
    total += byte;
    if (byte !== 255) return total;
  }
}

/**
 * Decode one LZ4 block (the raw block format, no frame wrapper).
 * A block is a sequence of `token | literals | offset | match` runs.
 */
export function decodeLz4Block(block: Uint8Array): Uint8Array {
  const out = new ByteSink(Math.max(64, block.length * 3));
  const cursor = { p: 0 };

  while (cursor.p < block.length) {
    const token = block[cursor.p++];

    let literalLength = token >>> 4;
    if (literalLength === 15) {
      literalLength += readExtendedLength(block, cursor);
    }
    if (cursor.p + literalLength > block.length) {
      throw new Error("LZ4 literal run is truncated");
    }
    out.push(block.subarray(cursor.p, cursor.p + literalLength));
    cursor.p += literalLength;

    // The final sequence of a block carries literals only.
    if (cursor.p >= block.length) break;

    if (cursor.p + 2 > block.length) {
      throw new Error("LZ4 match offset is truncated");
    }
    const offset = block[cursor.p] | (block[cursor.p + 1] << 8);
    cursor.p += 2;

    let matchLength = (token & 0x0f) + 4;
    if ((token & 0x0f) === 15) {
      matchLength += readExtendedLength(block, cursor);
    }
    out.copyMatch(offset, matchLength);
  }

  return out.result();
}

/**
 * Decode an LZ4 *frame* (magic 0x184D2204), the format Arrow's LZ4_FRAME type
 * uses. The descriptor checksum is not verified: a corrupted payload still
 * fails on block bounds, and a checksum mismatch has no useful repair path.
 */
export function decodeLz4Frame(src: Uint8Array): Uint8Array {
  if (src.length < 7) throw new Error("LZ4 frame is too short to hold a header");
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  if (view.getUint32(0, true) !== LZ4_FRAME_MAGIC) {
    throw new Error("Not an LZ4 frame (missing 0x184D2204 magic)");
  }

  let p = 4;
  const flg = src[p++];
  const version = (flg >>> 6) & 0x03;
  if (version !== 1) {
    throw new Error(`Unsupported LZ4 frame version ${version}`);
  }
  const blockChecksum = (flg & 0x10) !== 0;
  const contentSize = (flg & 0x08) !== 0;
  const dictId = (flg & 0x01) !== 0;

  p++; // BD: maximum block size, which bounds nothing we need to enforce.
  if (contentSize) p += 8;
  if (dictId) p += 4;
  p += 1; // Header checksum.

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (p + 4 <= src.length) {
    const raw = view.getUint32(p, true);
    p += 4;
    const blockSize = raw & 0x7fffffff;
    if (blockSize === 0) break; // EndMark.
    if (p + blockSize > src.length) {
      throw new Error("LZ4 frame block is truncated");
    }
    const block = src.subarray(p, p + blockSize);
    p += blockSize;

    // The high bit marks a block stored verbatim.
    const decoded = (raw & 0x80000000) !== 0 ? block : decodeLz4Block(block);
    chunks.push(decoded);
    total += decoded.length;
    if (blockChecksum) p += 4;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * ZSTD decoder backed by Node's built-in zstd binding (Node >= 22.15 / 23.8).
 * Absent on older runtimes, where we simply do not register a codec rather
 * than pretend the file is readable.
 */
function zstdCodec(): ArrowCodec | null {
  const z = zlib as unknown as {
    zstdDecompressSync?: (buf: Uint8Array) => Buffer;
  };
  if (typeof z.zstdDecompressSync !== "function") return null;
  const decompress = z.zstdDecompressSync;
  return { decode: (compressed) => new Uint8Array(decompress(compressed)) };
}

type ArrowModule = {
  compressionRegistry: { set: (type: number, codec: ArrowCodec | null) => void };
  CompressionType: { LZ4_FRAME: number; ZSTD: number };
};

/**
 * Teach `apache-arrow` how to decompress record-batch bodies.
 * Idempotent, so it is safe to call on every read.
 */
export function registerArrowCodecs(arrow: ArrowModule): void {
  arrow.compressionRegistry.set(arrow.CompressionType.LZ4_FRAME, {
    decode: decodeLz4Frame,
  });
  const zstd = zstdCodec();
  if (zstd) arrow.compressionRegistry.set(arrow.CompressionType.ZSTD, zstd);
}
