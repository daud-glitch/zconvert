import { formats } from "./src/lib/formats";
import { convertFile } from "./src/lib/converter";
import JSZip from "jszip";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const SAMPLE_SRT = Buffer.from(
  "1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n2\n00:00:04,000 --> 00:00:06,000\nSecond line\n",
  "utf-8",
);

async function makeZip(): Promise<Buffer> {
  const z = new JSZip();
  z.file("hello.txt", "Hello from zip");
  return Buffer.from(await z.generateAsync({ type: "arraybuffer" }));
}

async function makeMinimalEpub(): Promise<Buffer> {
  const z = new JSZip();
  z.file("mimetype", "application/epub+zip");
  z.file(
    "META-INF/container.xml",
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  z.file(
    "OEBPS/chapter1.xhtml",
    "<html><body><p>Test chapter</p></body></html>",
  );
  z.file(
    "OEBPS/content.opf",
    '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>T</dc:title></metadata><manifest><item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>',
  );
  return Buffer.from(await z.generateAsync({ type: "arraybuffer" }));
}

function magic(buf: Buffer): string {
  if (buf.length < 4) return "empty";
  if (buf[0] === 0x50 && buf[1] === 0x4b) return "zip";
  if (buf[0] === 0x25 && buf[1] === 0x50) return "pdf";
  if (buf.slice(0, 3).toString() === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0))
    return "audio";
  if (buf.toString("utf-8", 0, 40).includes("WEBVTT")) return "vtt";
  if (/^\d+\n\d{2}:/.test(buf.toString("utf-8", 0, 20))) return "srt";
  return buf.slice(0, 8).toString("hex");
}

async function test(
  src: string,
  dst: string,
  input: Buffer,
): Promise<{ ok: boolean; size?: number; sniff?: string; error?: string }> {
  try {
    const out = await convertFile(input, src, dst);
    return { ok: true, size: out.length, sniff: magic(out) };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 72) };
  }
}

type Expectation = "expect-success" | "expect-error" | "optional";

function log(
  label: string,
  r: Awaited<ReturnType<typeof test>>,
  expectation: Expectation = "expect-success",
) {
  const status =
    expectation === "expect-error"
      ? r.ok
        ? "UNEXPECTED-PASS"
        : "OK-ERR"
      : expectation === "optional"
        ? r.ok
          ? "PASS-OPT"
          : "SKIP-OPT"
        : r.ok
          ? "PASS"
          : "FAIL";
  console.log(
    `${status} ${label}`,
    r.ok ? `${r.size}b ${r.sniff}` : r.error,
  );
}

async function auditCategory(name: string) {
  const count = formats.filter((f) => f.category === name).length;
  console.log(`\n######## ${name.toUpperCase()} (${count} formats) ########`);
}

async function main() {
  console.log("=== ZConvert multi-category audit ===\n");

  await auditCategory("audio");
  console.log("(audio requires real media files — testing invalid target only)");
  log("png -> mp3 (should fail)", await test("png", "mp3", SAMPLE_PNG), "expect-error");

  await auditCategory("subtitle");
  for (const dst of ["vtt", "ass", "srt", "ssa", "sub", "mpl"]) {
    log(`srt -> ${dst}`, await test("srt", dst, SAMPLE_SRT));
  }
  log("srt -> pdf (unsupported)", await test("srt", "pdf", SAMPLE_SRT), "expect-error");

  await auditCategory("presentation");
  const presText = Buffer.from("# Slide\n\nBullet one\n", "utf-8");
  for (const dst of ["pdf", "pptx", "odp", "png", "html", "txt"]) {
    log(`md-via-pres -> ${dst}`, await test("pptx", dst, presText));
  }

  await auditCategory("archive");
  const zipIn = await makeZip();
  for (const dst of ["zip", "tar", "tar.gz", "7z", "rar", "tar.xz"]) {
    const expectation: Expectation = ["7z", "rar", "tar.xz"].includes(dst)
      ? "optional"
      : "expect-success";
    log(`zip -> ${dst}`, await test("zip", dst, zipIn), expectation);
  }

  await auditCategory("ebook");
  const epub = await makeMinimalEpub();
  for (const dst of ["pdf", "txt", "epub", "pptx", "html"]) {
    log(`epub -> ${dst}`, await test("epub", dst, epub));
  }

  await auditCategory("font");
  console.log("(font tests need real font binaries — testing error path)");
  log("png -> ttf (should fail)", await test("png", "ttf", SAMPLE_PNG), "expect-error");

  await auditCategory("image");
  log("png -> webp", await test("png", "webp", SAMPLE_PNG));
  log("png -> heic (should error)", await test("png", "heic", SAMPLE_PNG), "expect-error");

  console.log("\n=== Category counts ===");
  const cats = [
    "image",
    "audio",
    "document",
    "data",
    "archive",
    "ebook",
    "presentation",
    "subtitle",
    "font",
    "other",
  ] as const;
  for (const c of cats) {
    console.log(`  ${c}: ${formats.filter((f) => f.category === c).length}`);
  }
}

main().catch(console.error);
