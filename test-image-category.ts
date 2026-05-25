import { formats } from "./src/lib/formats";
import { convertFile } from "./src/lib/converter";
import sharp from "sharp";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const CORE_TARGETS = [
  "jpg",
  "webp",
  "avif",
  "bmp",
  "gif",
  "tiff",
  "ico",
  "pdf",
];

function magic(buf: Buffer): string {
  if (buf.length < 4) return "empty";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "gif";
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "bmp";
  if (buf[0] === 0x25 && buf[1] === 0x50) return "pdf";
  if (buf.slice(0, 4).toString() === "RIFF") return "webp";
  return buf.slice(0, 8).toString("hex");
}

/** Minimal valid QOI 2×2 (red, green / blue, yellow). */
function makeQoiSample(): Buffer {
  const w = 2;
  const h = 2;
  const body: number[] = [
    0xfe, 255, 0, 0, 255,
    0xff, 0, 255, 0,
    0xff, 0, 0, 255,
    0xfe, 255, 255, 0, 255,
    0x01,
  ];
  const buf = Buffer.alloc(14 + body.length + 8);
  buf.write("qoif", 0);
  buf.writeUInt32BE(w, 4);
  buf.writeUInt32BE(h, 8);
  buf.writeUInt8(4, 12);
  buf.writeUInt8(1, 13);
  Buffer.from(body).copy(buf, 14);
  buf.writeUInt32BE(0, 14 + body.length);
  buf.writeUInt32BE(0, 14 + body.length + 4);
  return buf;
}

function makeXbmSample(): Buffer {
  return Buffer.from(`#define width 2
#define height 2
static char bits[] = {
0x03, 0x00
};
`);
}

function makeXpmSample(): Buffer {
  return Buffer.from(`2 2 2 1
a c #ff0000
b c #00ff00
aa
bb
`);
}

function makeTgaSample(): Buffer {
  const w = 2;
  const h = 2;
  const buf = Buffer.alloc(18 + w * h * 3);
  buf[2] = 2;
  buf[8] = 24;
  buf[12] = w;
  buf[13] = w >> 8;
  buf[14] = h;
  buf[15] = h >> 8;
  let p = 18;
  const colors = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
  ];
  for (const [r, g, b] of colors) {
    buf[p++] = b;
    buf[p++] = g;
    buf[p++] = r;
  }
  return buf;
}

function makeMspSample(): Buffer {
  const w = 8;
  const h = 8;
  const buf = Buffer.alloc(32 + Math.ceil(w / 8) * h);
  buf.write("DanM", 0);
  buf.writeUInt16LE(w, 4);
  buf.writeUInt16LE(h, 6);
  return buf;
}

function makeDdsSample(): Buffer {
  const w = 4;
  const h = 4;
  const buf = Buffer.alloc(128 + w * h * 4);
  buf.write("DDS ", 0);
  buf.writeUInt32LE(124, 4);
  buf.writeUInt32LE(0x1007, 8);
  buf.writeUInt32LE(h, 12);
  buf.writeUInt32LE(w, 16);
  buf.writeUInt32LE(0x08, 20);
  buf.writeUInt32LE(w * h * 4, 36);
  buf.writeUInt32LE(0x41, 80);
  buf.writeUInt32LE(32, 88);
  let p = 128;
  for (let i = 0; i < w * h; i++) {
    buf[p++] = 0;
    buf[p++] = 0;
    buf[p++] = 255;
    buf[p++] = 255;
  }
  return buf;
}

async function makeSource(ext: string): Promise<Buffer | null> {
  try {
    const enc = async (fn: () => Promise<Buffer>) => {
      try {
        return await fn();
      } catch {
        return null;
      }
    };

    const viaConvert: Record<string, string> = {
      bmp: "bmp",
      gif: "gif",
      avif: "avif",
      tiff: "tiff",
      jpg: "jpg",
      jpeg: "jpg",
      webp: "webp",
    };
    if (viaConvert[ext]) {
      return enc(() => convertFile(SAMPLE_PNG, "png", viaConvert[ext]));
    }
    if (ext === "apng") return enc(() => Promise.resolve(SAMPLE_PNG));

    switch (ext) {
      case "svg":
        return Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
        );
      case "ppm":
        return Buffer.from(
          "P3\n2 2\n255\n255 0 0  0 255 0\n 0 0 255  255 255 0\n",
        );
      case "pbm":
        return Buffer.from("P1\n2 2\n1 0\n0 1\n");
      case "pgm":
        return Buffer.from("P2\n2 2\n255\n100 150\n200 50\n");
      case "pnm":
        return Buffer.from("P3\n1 1\n255\n255 0 0\n");
      case "pfm":
        return Buffer.from("Pf\n1 1\n-1.0\n0.5\n");
      case "qoi":
        return makeQoiSample();
      case "xbm":
        return makeXbmSample();
      case "xpm":
        return makeXpmSample();
      case "tga":
        return makeTgaSample();
      case "msp":
        return makeMspSample();
      case "dds":
        return makeDdsSample();
      case "ico":
        return convertFile(SAMPLE_PNG, "png", "ico");
      case "cur":
        return convertFile(SAMPLE_PNG, "png", "cur");
      case "dib":
        return enc(() => convertFile(SAMPLE_PNG, "png", "bmp"));
      case "mpo":
        return enc(() => convertFile(SAMPLE_PNG, "png", "jpg"));
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function main() {
  const imageFormats = formats.filter((f) => f.category === "image");
  console.log(`Image formats in UI: ${imageFormats.length}\n`);

  const results: { src: string; dst: string; status: string; detail: string }[] =
    [];

  console.log("=== PNG -> targets ===");
  for (const dst of CORE_TARGETS) {
    try {
      const out = await convertFile(SAMPLE_PNG, "png", dst);
      const ok =
        magic(out) === dst ||
        (dst === "jpg" && magic(out) === "jpeg");
      console.log(
        `${ok ? "PASS" : "WARN"} png -> ${dst} | ${out.length}b ${magic(out)}`,
      );
      results.push({
        src: "png",
        dst,
        status: ok ? "PASS" : "WARN",
        detail: magic(out),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL png -> ${dst} | ${msg}`);
      results.push({ src: "png", dst, status: "FAIL", detail: msg });
    }
  }

  console.log("\n=== Each source -> png ===");
  let pass = 0;
  let fail = 0;
  let skip = 0;
  for (const fmt of imageFormats) {
    const src = fmt.ext;
    if (src === "png") continue;
    const input = await makeSource(src);
    if (!input) {
      console.log(`SKIP ${src} -> png (no sample)`);
      results.push({ src, dst: "png", status: "SKIP", detail: "no sample" });
      skip++;
      continue;
    }
    try {
      const out = await convertFile(input, src, "png");
      const ok = magic(out) === "png" && out.length >= 50;
      console.log(
        `${ok ? "PASS" : "WARN"} ${src} -> png | ${out.length}b`,
      );
      if (ok) pass++;
      else fail++;
      results.push({
        src,
        dst: "png",
        status: ok ? "PASS" : "WARN",
        detail: `${out.length}b`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL ${src} -> png | ${msg}`);
      results.push({ src, dst: "png", status: "FAIL", detail: msg });
      fail++;
    }
  }

  console.log(
    `\n=== SUMMARY: ${pass} pass, ${fail} fail/warn, ${skip} skip (no sample) ===`,
  );
  results
    .filter((r) => r.status === "FAIL")
    .forEach((f) => console.log(`  ${f.src} -> ${f.dst}: ${f.detail}`));
}

main().catch(console.error);
