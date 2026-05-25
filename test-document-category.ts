import { formats } from "./src/lib/formats";
import { convertFile } from "./src/lib/converter";

const samples = {
  md: Buffer.from("# Hello World\n\nThis is **bold** and *italic*.\n\n## Section 2\n\nMore text here.\n", "utf-8"),
  html: Buffer.from("<!DOCTYPE html><html><head><title>T</title></head><body><h1>Hello</h1><p>World <strong>bold</strong></p></body></html>", "utf-8"),
  txt: Buffer.from("Line one.\nLine two.\nLine three.\n", "utf-8"),
  rst: Buffer.from("Title\n=====\n\nHello world.\n", "utf-8"),
  adoc: Buffer.from("= Title\n\nHello *world*.\n", "utf-8"),
  tex: Buffer.from("\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}\n", "utf-8"),
  rtf: Buffer.from("{\\rtf1\\ansi Hello World}", "utf-8"),
  json: Buffer.from('{"title":"Test","body":"Hello"}', "utf-8"),
  eml: Buffer.from("Subject: Test\n\nHello from email.\n", "utf-8"),
};

const coreTargets = [
  "txt", "md", "html", "pdf", "docx", "odt", "rtf", "tex", "epub", "pptx",
  "json", "yaml", "xml", "csv",
];

function sniff(buf: Buffer, ext: string): string {
  if (ext === "pdf" && buf.slice(0, 4).toString() === "%PDF") return "pdf-ok";
  if (ext === "docx" && buf[0] === 0x50 && buf[1] === 0x4b) return "zip-ok";
  if (ext === "odt" && buf[0] === 0x50 && buf[1] === 0x4b) return "zip-ok";
  if (ext === "epub" && buf[0] === 0x50 && buf[1] === 0x4b) return "zip-ok";
  if (ext === "pptx" && buf[0] === 0x50 && buf[1] === 0x4b) return "zip-ok";
  if (ext === "html" && buf.toString("utf-8", 0, 200).includes("<")) return "html-ok";
  if (["txt", "md", "rtf", "tex", "json", "yaml", "xml", "csv"].includes(ext)) {
    const t = buf.toString("utf-8", 0, 500);
    return t.length > 5 ? "text-ok" : "text-short";
  }
  return `raw:${buf.slice(0, 8).toString("hex")}`;
}

async function test(src: string, dst: string, input: Buffer) {
  try {
    const out = await convertFile(input, src, dst);
    return { ok: true, size: out.length, sniff: sniff(out, dst) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const docFormats = formats.filter((f) => f.category === "document");
  console.log(`Document formats in UI: ${docFormats.length}\n`);

  console.log("=== MD -> targets ===");
  for (const dst of coreTargets) {
    const r = await test("md", dst, samples.md);
    console.log(`${r.ok ? "PASS" : "FAIL"} md -> ${dst}`, r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70));
  }

  console.log("\n=== HTML -> key targets ===");
  for (const dst of ["md", "pdf", "txt", "docx", "html", "doc", "xlsx", "parquet"]) {
    const r = await test("html", dst, samples.html);
    console.log(`${r.ok ? "PASS" : "FAIL"} html -> ${dst}`, r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70));
  }

  console.log("\n=== Text formats -> pdf ===");
  for (const src of ["txt", "rst", "adoc", "eml"] as const) {
    const r = await test(src, "pdf", samples[src]);
    console.log(`${r.ok ? "PASS" : "FAIL"} ${src} -> pdf`, r.ok ? `${r.size}b` : r.error?.slice(0, 70));
  }

  console.log("\n=== PDF roundtrip ===");
  const pdf = await test("md", "pdf", samples.md);
  if (pdf.ok) {
    const pdfBuf = await convertFile(samples.md, "md", "pdf");
    for (const dst of ["txt", "md", "html", "docx"]) {
      const r = await test("pdf", dst, pdfBuf);
      const preview = r.ok ? (await convertFile(pdfBuf, "pdf", dst)).toString("utf-8").slice(0, 40) : "";
      console.log(`${r.ok ? "PASS" : "FAIL"} pdf -> ${dst}`, r.ok ? `${r.size}b "${preview.replace(/\n/g, " ")}"` : r.error?.slice(0, 70));
    }
    const rImg = await test("pdf", "png", pdfBuf);
    console.log(`${rImg.ok ? "PASS" : "FAIL"} pdf -> png`, rImg.ok ? `${rImg.size}b ${rImg.sniff}` : rImg.error?.slice(0, 70));
  }

  console.log("\n=== Misleading targets (should error not garbage) ===");
  for (const [src, dst] of [["md", "doc"], ["html", "mobi"], ["html", "xlsx"], ["txt", "feather"]] as const) {
    const r = await test(src, dst, samples[src as keyof typeof samples]);
    const bad = r.ok && (dst === "doc" || dst === "mobi" || dst === "xlsx" || dst === "feather");
    console.log(`${bad ? "BUG" : r.ok ? "OK" : "OK-ERR"} ${src} -> ${dst}`, r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 60));
  }
}

main().catch(console.error);
