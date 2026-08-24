import { readPsd } from "ag-psd";
import sharp from "sharp";
import { decodeNetpbm } from "./netpbm";

/** Decode any supported image input to PNG bytes for sharp. */
export async function decodeImageToPng(
  input: Buffer,
  inputExt: string,
): Promise<Buffer> {
  const ext = inputExt.toLowerCase().replace(/^jfif$/, "jpg");

  const specialist = await decodeByExtension(input, ext);
  if (specialist) return specialist;

  const sharpOpts = sharpOptionsFor(ext);
  try {
    return await sharp(input, { failOn: "none", ...sharpOpts })
      .png()
      .toBuffer();
  } catch {
    /* try generic */
  }

  throw new Error(
    `Cannot decode .${ext.toUpperCase()} image. The file may be corrupt or use an unsupported variant.`,
  );
}

function sharpOptionsFor(ext: string): sharp.SharpOptions {
  if (["apng", "gif"].includes(ext)) {
    return { animated: true, page: 0 };
  }
  if (["mpo", "tiff", "tif", "heic", "heif", "jp2"].includes(ext)) {
    return { page: 0 };
  }
  if (ext === "svg") return { density: 300 };
  return {};
}

async function decodeByExtension(
  input: Buffer,
  ext: string,
): Promise<Buffer | null> {
  switch (ext) {
    case "ico":
    case "cur":
      return decodeIcoCur(input);
    case "pbm":
    case "pgm":
    case "ppm":
    case "pnm":
      return rgbaToPng(decodeNetpbm(input));
    case "pfm":
      return rgbaToPng(decodePfm(input));
    case "qoi":
      return rgbaToPng(decodeQoi(input));
    case "psd":
      return decodePsd(input);
    case "pcx":
      return rgbaToPng(decodePcx(input));
    case "tga":
      return rgbaToPng(decodeTga(input));
    case "xbm":
      return rgbaToPng(decodeXbm(input));
    case "xpm":
      return rgbaToPng(decodeXpm(input));
    case "icns":
      return decodeIcns(input);
    case "msp":
      return rgbaToPng(decodeMsp(input));
    case "bmp":
      return rgbaToPng(decodeBmpToRgba(input));
    case "dib":
      return decodeDib(input);
    case "dcx":
      return rgbaToPng(decodeDcxFirstPage(input));
    case "mpo":
      return decodeMpoFirstJpeg(input);
    case "eps":
      return decodeEpsEmbedded(input);
    case "sgi":
      return rgbaToPng(decodeSgi(input));
    case "dds":
      return rgbaToPng(decodeDds(input));
    case "blp":
      return decodeBlp(input);
    case "fli":
    case "flc":
      return rgbaToPng(decodeFliFirstFrame(input));
    case "tgs":
      throw new Error(
        "TGS (Telegram animated sticker) is vector animation data and cannot be rasterized without a Lottie renderer.",
      );
    default:
      return null;
  }
}

async function rgbaToPng(img: {
  data: Buffer;
  width: number;
  height: number;
  channels?: 3 | 4;
}): Promise<Buffer> {
  const channels = img.channels ?? 4;
  return sharp(img.data, {
    raw: { width: img.width, height: img.height, channels },
  })
    .png()
    .toBuffer();
}

// ─── ICO / CUR ───────────────────────────────────────────────────────────────

async function decodeIcoCur(input: Buffer): Promise<Buffer> {
  if (input.length < 22) throw new Error("Invalid icon file");
  const count = input.readUInt16LE(4);
  if (count < 1) throw new Error("Icon file has no images");
  let best: { area: number; offset: number; size: number } | null = null;
  for (let i = 0; i < count; i++) {
    const base = 6 + i * 16;
    const w = input.readUInt8(base) || 256;
    const h = input.readUInt8(base + 1) || 256;
    const size = input.readUInt32LE(base + 8);
    const offset = input.readUInt32LE(base + 12);
    const area = w * h;
    if (!best || area > best.area) best = { area, offset, size };
  }
  const { offset, size } = best!;
  const chunk = input.subarray(offset, offset + size);
  if (chunk[0] === 0x89 && chunk[1] === 0x50) {
    return sharp(chunk).png().toBuffer();
  }
  const { data, width, height } = decodeBmpToRgba(chunk);
  return rgbaToPng({ data, width, height });
}

function decodeBmpToRgba(bmp: Buffer): {
  data: Buffer;
  width: number;
  height: number;
} {
  if (bmp.length < 54 || bmp.toString("ascii", 0, 2) !== "BM") {
    throw new Error("Invalid BMP data in icon");
  }
  const pixelOffset = bmp.readUInt32LE(10);
  const width = bmp.readInt32LE(18);
  const height = Math.abs(bmp.readInt32LE(22));
  const bpp = bmp.readUInt16LE(28);
  if (bpp !== 24 && bpp !== 32) {
    throw new Error(`BMP ${bpp}-bit not supported in icon`);
  }
  const rowSize = Math.ceil((width * (bpp / 8)) / 4) * 4;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const srcIdx = pixelOffset + srcY * rowSize + x * (bpp / 8);
      const dstIdx = (y * width + x) * 4;
      rgba[dstIdx + 2] = bmp[srcIdx];
      rgba[dstIdx + 1] = bmp[srcIdx + 1];
      rgba[dstIdx] = bmp[srcIdx + 2];
      rgba[dstIdx + 3] = bpp === 32 ? bmp[srcIdx + 3] : 255;
    }
  }
  return { data: rgba, width, height };
}

// ─── QOI (Quite OK Image) ────────────────────────────────────────────────────

function decodeQoi(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  if (input.length < 14 || input.toString("ascii", 0, 4) !== "qoif") {
    throw new Error("Invalid QOI file");
  }
  const width = input.readUInt32BE(4);
  const height = input.readUInt32BE(8);
  const channels = input.readUInt8(12);
  const hasAlpha = channels === 4;
  const pixelCount = width * height;
  const pixels = Buffer.alloc(pixelCount * 4);
  const index: Array<[number, number, number, number]> = new Array(64).fill([
    0, 0, 0, 0,
  ]);
  let r = 0,
    g = 0,
    b = 0,
    a = 255;
  let px = 0;
  let p = 14;

  const push = (rr: number, gg: number, bb: number, aa: number) => {
    pixels[px++] = rr;
    pixels[px++] = gg;
    pixels[px++] = bb;
    pixels[px++] = aa;
    const idx =
      (rr * 3 + gg * 5 + bb * 7 + aa * 11) % 64;
    index[idx] = [rr, gg, bb, aa];
  };

  while (px < pixelCount * 4 && p < input.length - 1) {
    const tag = input[p++];
    if (tag === 0xfe) {
      r = input[p++];
      g = input[p++];
      b = input[p++];
      a = hasAlpha ? input[p++] : 255;
      push(r, g, b, a);
    } else if (tag === 0xff) {
      r = input[p++];
      g = input[p++];
      b = input[p++];
      push(r, g, b, a);
    } else if ((tag & 0xc0) === 0x00) {
      r = (r + ((tag >> 4) & 3) - 2) & 255;
      g = (g + ((tag >> 2) & 3) - 2) & 255;
      b = (b + (tag & 3) - 2) & 255;
      push(r, g, b, a);
    } else if ((tag & 0xc0) === 0x40) {
      const v = input[p++];
      r = input[p++];
      g = ((tag & 0x0f) << 4) | (v >> 4);
      b = ((v & 0x0f) << 4) | (input[p] >> 4);
      if (hasAlpha) a = input[p++] & 0x0f;
      push(r, g, b, a);
    } else if ((tag & 0xc0) === 0x80) {
      const v = input[p++];
      r = (r + (tag - 0x80 - 16)) & 255;
      g = (g + (v >> 4) - 8) & 255;
      b = (b + (v & 0x0f) - 8) & 255;
      push(r, g, b, a);
    } else if ((tag & 0xc0) === 0xc0) {
      const run = tag - 0xbf;
      for (let i = 0; i < run; i++) push(r, g, b, a);
    } else {
      const idx = tag;
      [r, g, b, a] = index[idx];
      push(r, g, b, a);
    }
  }
  return { data: pixels, width, height, channels: 4 };
}

// ─── PSD ─────────────────────────────────────────────────────────────────────

async function decodePsd(input: Buffer): Promise<Buffer> {
  const psd = readPsd(input, { useImageData: true });
  const img = psd.imageData;
  if (!img?.data || !img.width || !img.height) {
    throw new Error("PSD has no composite image data");
  }
  const { data, width, height } = img;
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * 4];
    rgba[i * 4 + 1] = data[i * 4 + 1];
    rgba[i * 4 + 2] = data[i * 4 + 2];
    rgba[i * 4 + 3] = data[i * 4 + 3] ?? 255;
  }
  return rgbaToPng({ data: rgba, width, height });
}

// ─── PCX / DCX ───────────────────────────────────────────────────────────────

function decodePcx(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  if (input.length < 128 || input[0] !== 0x0a) {
    throw new Error("Invalid PCX file");
  }
  const encoding = input[2];
  const width = input.readUInt16LE(8) - input.readUInt16LE(4) + 1;
  const height = input.readUInt16LE(10) - input.readUInt16LE(6) + 1;
  const bpp = input.readUInt8(65);
  const planes = input.readUInt8(66);
  const bytesPerLine = input.readUInt16LE(66);
  let pos = 128;
  const planeData: number[][] = Array.from({ length: planes }, () => []);

  for (let y = 0; y < height; y++) {
    for (let pl = 0; pl < planes; pl++) {
      let x = 0;
      while (x < bytesPerLine) {
        if (encoding === 1) {
          let b = input[pos++];
          if ((b & 0xc0) === 0xc0) {
            const count = b & 0x3f;
            b = input[pos++];
            for (let i = 0; i < count && x < bytesPerLine; i++) {
              planeData[pl][y * bytesPerLine + x++] = b;
            }
          } else {
            planeData[pl][y * bytesPerLine + x++] = b;
          }
        } else {
          planeData[pl][y * bytesPerLine + x++] = input[pos++];
        }
      }
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  if (bpp === 8 && planes === 1) {
    const palOffset = input.length - 769;
    const palette: number[][] = [];
    if (input[palOffset] === 0x0c) {
      for (let i = 0; i < 256; i++) {
        palette.push([
          input[palOffset + 1 + i * 3],
          input[palOffset + 2 + i * 3],
          input[palOffset + 3 + i * 3],
        ]);
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = planeData[0][y * bytesPerLine + x] ?? 0;
        const c = palette[idx] ?? [idx, idx, idx];
        const o = (y * width + x) * 4;
        rgba[o] = c[0];
        rgba[o + 1] = c[1];
        rgba[o + 2] = c[2];
        rgba[o + 3] = 255;
      }
    }
  } else if (bpp === 24 && planes === 3) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4;
        rgba[o] = planeData[0][y * bytesPerLine + x] ?? 0;
        rgba[o + 1] = planeData[1][y * bytesPerLine + x] ?? 0;
        rgba[o + 2] = planeData[2][y * bytesPerLine + x] ?? 0;
        rgba[o + 3] = 255;
      }
    }
  } else {
    throw new Error(`PCX ${bpp}bpp/${planes} plane not supported`);
  }
  return { data: rgba, width, height, channels: 4 };
}

function decodeDcxFirstPage(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  if (input.length < 8 || input.readUInt32LE(0) !== 0x3ade68b1) {
    throw new Error("Invalid DCX file");
  }
  const pageOffset = input.readUInt32LE(4);
  return decodePcx(input.subarray(pageOffset));
}

// ─── TGA (uncompressed true-color) ───────────────────────────────────────────

function decodeTga(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  if (input.length < 18) throw new Error("Invalid TGA file");
  const type = input[2];
  if (type !== 2) throw new Error(`TGA type ${type} not supported (only type 2)`);
  const width = input.readUInt16LE(12);
  const height = input.readUInt16LE(14);
  const depth = input[8];
  const idLen = input[0];
  let pos = 18 + idLen;
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const b = input[pos++];
    const g = input[pos++];
    const r = input[pos++];
    const a = depth === 32 ? input[pos++] : 255;
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }
  return { data: rgba, width, height, channels: 4 };
}

// ─── XBM / XPM ───────────────────────────────────────────────────────────────

function decodeXbm(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  const text = input.toString("utf-8");
  const wMatch = text.match(/width\s+(\d+)/i);
  const hMatch = text.match(/height\s+(\d+)/i);
  const width = wMatch ? parseInt(wMatch[1], 10) : 0;
  const height = hMatch ? parseInt(hMatch[1], 10) : 0;
  if (!width || !height) throw new Error("Invalid XBM file");
  const hex = text.match(/0x[0-9a-fA-F]+/g) ?? [];
  const rgba = Buffer.alloc(width * height * 4, 255);
  let bit = 0;
  for (const h of hex) {
    const byte = parseInt(h, 16);
    for (let i = 0; i < 8; i++) {
      if (bit >= width * height) break;
      const on = (byte >> i) & 1;
      const v = on ? 0 : 255;
      rgba[bit * 4] = v;
      rgba[bit * 4 + 1] = v;
      rgba[bit * 4 + 2] = v;
      bit++;
    }
  }
  return { data: rgba, width, height, channels: 4 };
}

function decodeXpm(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  const lines = input
    .toString("utf-8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const vals = lines[0].match(/\d+/g)?.map(Number) ?? [];
  const width = vals[0] ?? 0;
  const height = vals[1] ?? 0;
  const ncolors = vals[2] ?? 0;
  const cpp = vals[3] ?? 1;
  if (!width || !height) throw new Error("Invalid XPM file");
  const colors: Record<string, [number, number, number, number]> = {};
  let i = 1;
  for (; i <= ncolors && i < lines.length; i++) {
    const key = lines[i].slice(0, cpp);
    const none = /c\s+None/i.test(lines[i]);
    const m = lines[i].match(/c\s+#([0-9a-fA-F]{6})/i);
    if (none) colors[key] = [0, 0, 0, 0];
    else if (m) {
      const hex = m[1];
      colors[key] = [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        255,
      ];
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = lines[i + y] ?? "";
    for (let x = 0; x < width; x++) {
      const key = row.slice(x * cpp, x * cpp + cpp);
      const c = colors[key] ?? [0, 0, 0, 255];
      const o = (y * width + x) * 4;
      rgba[o] = c[0];
      rgba[o + 1] = c[1];
      rgba[o + 2] = c[2];
      rgba[o + 3] = c[3];
    }
  }
  return { data: rgba, width, height, channels: 4 };
}

// ─── PFM ─────────────────────────────────────────────────────────────────────

function decodePfm(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  const nl = input.indexOf(0x0a);
  const magic = input.toString("ascii", 0, nl).trim();
  if (magic !== "PF" && magic !== "Pf") {
    throw new Error("Invalid PFM file");
  }
  let pos = nl + 1;
  const line2End = input.indexOf(0x0a, pos);
  const [w, h] = input
    .toString("ascii", pos, line2End)
    .trim()
    .split(/\s+/)
    .map(Number);
  pos = input.indexOf(0x0a, line2End + 1) + 1;
  const rgba = Buffer.alloc(w * h * 4);
  const rgb = magic === "PF";
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (rgb) {
        const r = input.readFloatLE(pos);
        pos += 4;
        const g = input.readFloatLE(pos);
        pos += 4;
        const b = input.readFloatLE(pos);
        pos += 4;
        rgba[o] = Math.min(255, Math.max(0, Math.round(r * 255)));
        rgba[o + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
        rgba[o + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
      } else {
        const v = input.readFloatLE(pos);
        pos += 4;
        const c = Math.min(255, Math.max(0, Math.round(v * 255)));
        rgba[o] = c;
        rgba[o + 1] = c;
        rgba[o + 2] = c;
      }
      rgba[o + 3] = 255;
    }
  }
  return { data: rgba, width: w, height: h, channels: 4 };
}

// ─── ICNS ────────────────────────────────────────────────────────────────────

async function decodeIcns(input: Buffer): Promise<Buffer> {
  if (input.length < 8 || input.toString("ascii", 0, 4) !== "icns") {
    throw new Error("Invalid ICNS file");
  }
  let bestPng: Buffer | null = null;
  let bestArea = 0;
  let pos = 8;
  while (pos + 8 <= input.length) {
    const len = input.readUInt32BE(pos + 4);
    const data = input.subarray(pos + 8, pos + len);
    pos += len;
    if (data[0] === 0x89 && data[1] === 0x50 && data.length > bestArea) {
      bestPng = data;
      bestArea = data.length;
    }
  }
  if (!bestPng) throw new Error("ICNS has no embedded PNG");
  return sharp(bestPng).png().toBuffer();
}

// ─── MSP ─────────────────────────────────────────────────────────────────────

function decodeMsp(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  const header = input.toString("ascii", 0, 4);
  if (header !== "DanM" && header !== "LinS") {
    throw new Error("Invalid MSP file");
  }
  const width = input.readUInt16LE(4);
  const height = input.readUInt16LE(6);
  const rowBytes = Math.ceil(width / 8);
  const rgba = Buffer.alloc(width * height * 4, 255);
  let pos = 32;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bit = 7 - (x % 8);
      const on = (input[pos + Math.floor(x / 8)] >> bit) & 1;
      const v = on ? 0 : 255;
      const o = (y * width + x) * 4;
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
    }
    pos += rowBytes;
  }
  return { data: rgba, width, height, channels: 4 };
}

// ─── DIB / MPO / EPS ─────────────────────────────────────────────────────────

async function decodeDib(input: Buffer): Promise<Buffer> {
  if (input.length >= 2 && input.toString("ascii", 0, 2) === "BM") {
    return rgbaToPng(decodeBmpToRgba(input));
  }
  const header = Buffer.alloc(14);
  header.write("BM");
  const size = 14 + input.length;
  header.writeUInt32LE(size, 2);
  header.writeUInt32LE(14, 10);
  return sharp(Buffer.concat([header, input])).png().toBuffer();
}

async function decodeMpoFirstJpeg(input: Buffer): Promise<Buffer> {
  for (let i = 0; i < input.length - 1; i++) {
    if (input[i] === 0xff && input[i + 1] === 0xd8) {
      let end = i + 2;
      while (end < input.length - 1) {
        if (input[end] === 0xff && input[end + 1] === 0xd9) {
          end += 2;
          return sharp(input.subarray(i, end)).png().toBuffer();
        }
        end++;
      }
    }
  }
  return sharp(input, { page: 0 }).png().toBuffer();
}

async function decodeEpsEmbedded(input: Buffer): Promise<Buffer> {
  for (let i = 0; i < input.length - 3; i++) {
    if (
      input[i] === 0x49 &&
      input[i + 1] === 0x49 &&
      input[i + 2] === 0x2a
    ) {
      try {
        return await sharp(input.subarray(i)).png().toBuffer();
      } catch {
        /* continue */
      }
    }
  }
  for (let i = 0; i < input.length - 1; i++) {
    if (input[i] === 0xff && input[i + 1] === 0xd8) {
      return sharp(input.subarray(i)).png().toBuffer();
    }
  }
  throw new Error(
    "EPS vector content cannot be rasterized without Ghostscript/ImageMagick.",
  );
}

// ─── SGI ─────────────────────────────────────────────────────────────────────

function decodeSgi(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  if (input.length < 512 || input.readUInt16BE(0) !== 474) {
    throw new Error("Invalid SGI file");
  }
  const width = input.readUInt16BE(6);
  const height = input.readUInt16BE(8);
  const channels = input.readUInt16BE(10);
  const rgba = Buffer.alloc(width * height * 4);
  for (let c = 0; c < Math.min(channels, 3); c++) {
    const start = input.readUInt32BE(512 + c * 4);
    let pos = start;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        rgba[(y * width + x) * 4 + (2 - c)] = input[pos++];
      }
    }
  }
  for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = 255;
  return { data: rgba, width, height, channels: 4 };
}

// ─── DDS ─────────────────────────────────────────────────────────────────────

function decodeDds(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  if (input.length < 128 || input.toString("ascii", 0, 4) !== "DDS ") {
    throw new Error("Invalid DDS file");
  }
  const height = input.readUInt32LE(12);
  const width = input.readUInt32LE(16);
  const fourCC = input.toString("ascii", 84, 88).replace(/\0/g, "");
  const rgba = Buffer.alloc(width * height * 4);
  if (fourCC === "DXT1" || fourCC === "DXT3" || fourCC === "DXT5") {
    decodeDxtSurface(rgba, width, height, input.subarray(128), fourCC);
  } else if (input.readUInt32LE(80) & 0x40) {
    const bpp = input.readUInt32LE(88);
    let pos = 128;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4;
        if (bpp === 32) {
          rgba[o + 2] = input[pos++];
          rgba[o + 1] = input[pos++];
          rgba[o] = input[pos++];
          rgba[o + 3] = input[pos++];
        } else {
          rgba[o + 2] = input[pos++];
          rgba[o + 1] = input[pos++];
          rgba[o] = input[pos++];
          rgba[o + 3] = 255;
          pos += bpp === 24 ? 0 : 0;
        }
      }
    }
  } else {
    throw new Error(`DDS pixel format "${fourCC}" not supported`);
  }
  return { data: rgba, width, height, channels: 4 };
}

function decodeDxtSurface(
  rgba: Buffer,
  width: number,
  height: number,
  data: Buffer,
  fourCC: string,
) {
  const blockBytes = fourCC === "DXT1" ? 8 : 16;
  let pos = 0;
  for (let by = 0; by < Math.ceil(height / 4); by++) {
    for (let bx = 0; bx < Math.ceil(width / 4); bx++) {
      const block = data.subarray(pos, pos + blockBytes);
      if (block.length < blockBytes) {
        throw new Error(`Truncated ${fourCC} texture data`);
      }
      if (fourCC === "DXT1") {
        decodeDxt1Block(rgba, width, height, bx * 4, by * 4, block);
      } else if (fourCC === "DXT3") {
        decodeDxt3Block(rgba, width, height, bx * 4, by * 4, block);
      } else {
        decodeDxt5Block(rgba, width, height, bx * 4, by * 4, block);
      }
      pos += blockBytes;
    }
  }
}

function decodeDxt1Block(
  rgba: Buffer,
  width: number,
  height: number,
  bx: number,
  by: number,
  block: Buffer,
) {
  writeDxtColorBlock(rgba, width, height, bx, by, block, true);
}

function decodeDxt3Block(
  rgba: Buffer,
  width: number,
  height: number,
  bx: number,
  by: number,
  block: Buffer,
) {
  writeDxtColorBlock(rgba, width, height, bx, by, block.subarray(8, 16), false);
  for (let y = 0; y < 4; y++) {
    const row = block.readUInt16LE(y * 2);
    for (let x = 0; x < 4; x++) {
      const px = bx + x;
      const py = by + y;
      if (px >= width || py >= height) continue;
      const a = (row >> (x * 4)) & 0xf;
      rgba[(py * width + px) * 4 + 3] = a * 17;
    }
  }
}

function decodeDxt5Block(
  rgba: Buffer,
  width: number,
  height: number,
  bx: number,
  by: number,
  block: Buffer,
) {
  writeDxtColorBlock(rgba, width, height, bx, by, block.subarray(8, 16), false);
  const a0 = block[0];
  const a1 = block[1];
  const alphas = [a0, a1];
  if (a0 > a1) {
    for (let i = 1; i <= 6; i++) {
      alphas.push(Math.round((a0 * (7 - i) + a1 * i) / 7));
    }
  } else {
    for (let i = 1; i <= 4; i++) {
      alphas.push(Math.round((a0 * (5 - i) + a1 * i) / 5));
    }
    alphas.push(0, 255);
  }
  let bits = BigInt(0);
  for (let i = 0; i < 6; i++) bits |= BigInt(block[2 + i]) << BigInt(8 * i);
  for (let i = 0; i < 16; i++) {
    const px = bx + (i % 4);
    const py = by + Math.floor(i / 4);
    if (px >= width || py >= height) continue;
    const idx = Number((bits >> BigInt(i * 3)) & BigInt(7));
    rgba[(py * width + px) * 4 + 3] = alphas[idx] ?? 255;
  }
}

function writeDxtColorBlock(
  rgba: Buffer,
  width: number,
  height: number,
  bx: number,
  by: number,
  block: Buffer,
  punchThroughAlpha: boolean,
) {
  const c0 = block.readUInt16LE(0);
  const c1 = block.readUInt16LE(2);
  const bits = block.readUInt32LE(4);
  const pal: [number, number, number][] = [expand565(c0), expand565(c1)];
  if (!punchThroughAlpha || c0 > c1) {
    pal.push(
      [
        Math.round((pal[0][0] * 2 + pal[1][0]) / 3),
        Math.round((pal[0][1] * 2 + pal[1][1]) / 3),
        Math.round((pal[0][2] * 2 + pal[1][2]) / 3),
      ],
      [
        Math.round((pal[0][0] + pal[1][0] * 2) / 3),
        Math.round((pal[0][1] + pal[1][1] * 2) / 3),
        Math.round((pal[0][2] + pal[1][2] * 2) / 3),
      ],
    );
  } else {
    pal.push(
      [
        Math.round((pal[0][0] + pal[1][0]) / 2),
        Math.round((pal[0][1] + pal[1][1]) / 2),
        Math.round((pal[0][2] + pal[1][2]) / 2),
      ],
      [0, 0, 0],
    );
  }
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const px = bx + x;
      const py = by + y;
      if (px >= width || py >= height) continue;
      const idx = (bits >> (y * 8 + x * 2)) & 3;
      const c = pal[idx] ?? [0, 0, 0];
      const o = (py * width + px) * 4;
      rgba[o] = c[0];
      rgba[o + 1] = c[1];
      rgba[o + 2] = c[2];
      rgba[o + 3] =
        punchThroughAlpha && c0 <= c1 && idx === 3 ? 0 : 255;
    }
  }
}

function expand565(c: number): [number, number, number] {
  const r = Math.round(((c >> 11) & 0x1f) * 255/31);
  const g = Math.round(((c >> 5) & 0x3f) * 255/63);
  const b = Math.round((c & 0x1f) * 255/31);
  return [r, g, b];
}

// ─── BLP (Blizzard texture: BLP1 JPEG/palette, BLP2 palette/DXT/BGRA) ─────────

async function decodeBlp(input: Buffer): Promise<Buffer> {
  if (input.length < 36) throw new Error("Invalid BLP file");
  const magic = input.toString("ascii", 0, 4);
  if (magic === "BLP1") return decodeBlp1(input);
  if (magic === "BLP2") return decodeBlp2(input);
  throw new Error("Invalid BLP file");
}

async function decodeBlp1(input: Buffer): Promise<Buffer> {
  const compression = input.readUInt32LE(4);
  const alphaDepth = input.readUInt32LE(8);
  const width = input.readUInt32LE(12);
  const height = input.readUInt32LE(16);
  const mipOffset = input.readUInt32LE(0x1c);
  const mipSize = input.readUInt32LE(0x5c);
  assertBlpDimensions(width, height);
  if (compression === 0) {
    return decodeBlpJpeg(input, 0x9c, mipOffset, mipSize);
  }
  if (compression === 1) {
    return rgbaToPng(
      decodeBlpPalette(input, width, height, mipOffset, mipSize, 0x9c, alphaDepth),
    );
  }
  throw new Error(`BLP1 compression ${compression} not supported`);
}

async function decodeBlp2(input: Buffer): Promise<Buffer> {
  const type = input.readUInt32LE(4);
  const encoding = input[8];
  const alphaDepth = input[9];
  const alphaEncoding = input[10];
  const width = input.readUInt32LE(12);
  const height = input.readUInt32LE(16);
  const mipOffset = input.readUInt32LE(0x14);
  const mipSize = input.readUInt32LE(0x54);
  assertBlpDimensions(width, height);
  if (type === 0) {
    return decodeBlpJpeg(input, 0x94, mipOffset, mipSize);
  }
  if (encoding === 1) {
    return rgbaToPng(
      decodeBlpPalette(input, width, height, mipOffset, mipSize, 0x94, alphaDepth),
    );
  }
  if (encoding === 2) {
    const fourCC =
      alphaEncoding === 1 ? "DXT3" : alphaEncoding === 7 ? "DXT5" : "DXT1";
    return rgbaToPng(wrapDxtAsRgba(input, width, height, mipOffset, fourCC));
  }
  if (encoding === 3 || encoding === 4) {
    return rgbaToPng(
      decodeBlpBgra(input, width, height, mipOffset, mipSize),
    );
  }
  throw new Error(`BLP2 encoding ${encoding} not supported`);
}

function assertBlpDimensions(width: number, height: number) {
  if (width < 1 || height < 1 || width > 16384 || height > 16384) {
    throw new Error("Invalid BLP dimensions");
  }
}

async function decodeBlpJpeg(
  input: Buffer,
  headerTableEnd: number,
  mipOffset: number,
  mipSize: number,
): Promise<Buffer> {
  const mip = sliceBlpMip(input, mipOffset, mipSize);
  if (mip.length >= 2 && mip[0] === 0xff && mip[1] === 0xd8) {
    return sharp(mip).png().toBuffer();
  }
  if (headerTableEnd + 4 <= input.length) {
    const headerSize = input.readUInt32LE(headerTableEnd);
    const headerStart = headerTableEnd + 4;
    if (headerSize > 0 && headerSize < input.length && headerStart + headerSize <= input.length) {
      const jpeg = Buffer.concat([
        input.subarray(headerStart, headerStart + headerSize),
        mip,
      ]);
      return sharp(jpeg).png().toBuffer();
    }
  }
  return sharp(mip).png().toBuffer();
}

function decodeBlpPalette(
  input: Buffer,
  width: number,
  height: number,
  mipOffset: number,
  mipSize: number,
  paletteOffset: number,
  alphaDepth: number,
): { data: Buffer; width: number; height: number; channels: 4 } {
  if (paletteOffset + 1024 > input.length) {
    throw new Error("BLP palette is truncated");
  }
  const count = width * height;
  const mip = sliceBlpMip(input, mipOffset, mipSize || count);
  if (mip.length < count) throw new Error("BLP pixel data is truncated");
  const rgba = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i++) {
    const pal = paletteOffset + mip[i] * 4;
    const o = i * 4;
    rgba[o] = input[pal + 2];
    rgba[o + 1] = input[pal + 1];
    rgba[o + 2] = input[pal];
    rgba[o + 3] = input[pal + 3] || 255;
  }
  applyBlpAlphaPlane(rgba, mip.subarray(count), alphaDepth, count);
  return { data: rgba, width, height, channels: 4 };
}

function applyBlpAlphaPlane(
  rgba: Buffer,
  alphaData: Buffer,
  alphaDepth: number,
  count: number,
) {
  if (alphaDepth === 8 && alphaData.length >= count) {
    for (let i = 0; i < count; i++) rgba[i * 4 + 3] = alphaData[i];
    return;
  }
  if (alphaDepth === 4 && alphaData.length >= Math.ceil(count / 2)) {
    for (let i = 0; i < count; i++) {
      const nibble = (alphaData[Math.floor(i / 2)] >> ((i & 1) * 4)) & 0xf;
      rgba[i * 4 + 3] = nibble * 17;
    }
    return;
  }
  if (alphaDepth === 1 && alphaData.length >= Math.ceil(count / 8)) {
    for (let i = 0; i < count; i++) {
      const bit = (alphaData[Math.floor(i / 8)] >> (i & 7)) & 1;
      rgba[i * 4 + 3] = bit ? 255 : 0;
    }
  }
}

function decodeBlpBgra(
  input: Buffer,
  width: number,
  height: number,
  mipOffset: number,
  mipSize: number,
): { data: Buffer; width: number; height: number; channels: 4 } {
  const count = width * height;
  const mip = sliceBlpMip(input, mipOffset, mipSize || count * 4);
  if (mip.length < count * 4) throw new Error("BLP pixel data is truncated");
  const rgba = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i++) {
    const s = i * 4;
    const o = i * 4;
    rgba[o] = mip[s + 2];
    rgba[o + 1] = mip[s + 1];
    rgba[o + 2] = mip[s];
    rgba[o + 3] = mip[s + 3];
  }
  return { data: rgba, width, height, channels: 4 };
}

function wrapDxtAsRgba(
  input: Buffer,
  width: number,
  height: number,
  mipOffset: number,
  fourCC: string,
): { data: Buffer; width: number; height: number; channels: 4 } {
  const blocks = Math.ceil(width / 4) * Math.ceil(height / 4);
  const blockBytes = fourCC === "DXT1" ? 8 : 16;
  const needed = blocks * blockBytes;
  const mip = sliceBlpMip(input, mipOffset, needed);
  const dds = Buffer.alloc(128 + needed);
  dds.write("DDS ", 0);
  dds.writeUInt32LE(124, 4);
  dds.writeUInt32LE(0xa1007, 8);
  dds.writeUInt32LE(height, 12);
  dds.writeUInt32LE(width, 16);
  dds.writeUInt32LE(needed, 20);
  dds.writeUInt32LE(32, 76);
  dds.writeUInt32LE(4, 80);
  dds.write(fourCC, 84);
  mip.copy(dds, 128, 0, needed);
  return decodeDds(dds);
}

function sliceBlpMip(input: Buffer, offset: number, size: number): Buffer {
  if (offset < 0 || offset >= input.length) {
    throw new Error("BLP mipmap offset is invalid");
  }
  const end = size > 0 ? Math.min(offset + size, input.length) : input.length;
  return input.subarray(offset, end);
}

// ─── FLI / FLC (first frame, 8-bit delta) ────────────────────────────────────

function decodeFliFirstFrame(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  const width = input.readUInt16LE(8);
  const height = input.readUInt16LE(10);
  const rgba = Buffer.alloc(width * height * 4, 0);
  let pos = 128;
  const chunks = input.readUInt16LE(pos);
  pos += 6;
  for (let c = 0; c < chunks && pos + 6 < input.length; c++) {
    const size = input.readUInt32LE(pos);
    const type = input.readUInt16LE(pos + 4);
    pos += 6;
    if (type === 15 || type === 16) {
      let p = pos;
      const end = pos + size - 6;
      const packets = input.readUInt16LE(p);
      p += 2;
      let y = 0;
      for (let pk = 0; pk < packets && p < end; pk++) {
        y += input.readUInt8(p++);
        const lines = input.readUInt8(p++);
        for (let ln = 0; ln < lines && p < end; ln++) {
          const count = input.readUInt8(p++);
          for (let i = 0; i < count && p + 1 < end; i++) {
            const x = input.readUInt8(p++);
            const px = input.readUInt8(p++);
            const o = (y * width + x) * 4;
            rgba[o] = px;
            rgba[o + 1] = px;
            rgba[o + 2] = px;
            rgba[o + 3] = 255;
          }
          y++;
        }
      }
      break;
    }
    pos += size - 6;
  }
  return { data: rgba, width, height, channels: 4 };
}
