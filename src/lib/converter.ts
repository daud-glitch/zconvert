import sharp from "sharp";
import fs from "fs/promises";
import { accessSync, constants as fsConstants } from "fs";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import mammoth from "mammoth";
import { isPdfRasterTarget } from "@/lib/pdf-raster-targets";
import { decodeImageToPng } from "@/lib/image-decode";
import { formats } from "@/lib/formats";
import {
  audioUnavailableMessage,
  videoUnavailableMessage,
  libreOfficeUnavailableMessage,
  calibreUnavailableMessage,
  rarUnavailableMessage,
  zstdUnavailableMessage,
  isFfmpegConversionAvailable,
} from "@/lib/upload-limits";
import {
  convertViaLibreOffice,
  convertViaCalibre,
  createRarWithToolchain,
} from "@/lib/external-toolchain";
import {
  extractArchiveEntries,
  extractDocText,
  extractDrawioContent,
  extractFb2Text,
  extractMsgText,
  extractP7mContent,
  packTo7zip,
  readBinaryDataRecords,
  writeParquetBuffer,
  type ArchiveEntry,
} from "@/lib/format-readers";
import PptxGenJS from "pptxgenjs";
import * as XLSX from "xlsx";
import archiver from "archiver";
import JSZip from "jszip";
import { marked } from "marked";
import TurndownService from "turndown";
import jsYaml from "js-yaml";
import toml from "@iarna/toml";
import ini from "ini";
import { parse as csvParse } from "csv-parse/sync";
import { stringify as csvStringify } from "csv-stringify/sync";
import he from "he";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import type Ffmpeg from "fluent-ffmpeg";

function ffmpegPathExists(binPath: string): boolean {
  try {
    accessSync(binPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveSystemFfmpegPath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const out = execFileSync(cmd, ["ffmpeg"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split(/\r?\n/)[0]
      ?.trim();
    return out && ffmpegPathExists(out) ? out : null;
  } catch {
    return null;
  }
}

/** Resolve ffmpeg binary (env → system PATH → ffmpeg-static). */
function resolveFfmpegBinaryPath(): string {
  const envPath =
    process.env.FFMPEG_BIN?.trim() || process.env.FFMPEG_PATH?.trim();
  if (envPath) {
    if (!ffmpegPathExists(envPath)) {
      throw new Error(
        `FFMPEG_BIN/FFMPEG_PATH is set to "${envPath}" but that file was not found.`,
      );
    }
    return envPath;
  }

  const systemPath = resolveSystemFfmpegPath();
  if (systemPath) return systemPath;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require("ffmpeg-static") as string | null | undefined;
    if (ffmpegStatic && ffmpegPathExists(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch (err) {
    console.error("Failed to load ffmpeg-static:", err);
  }

  throw new Error(
    "ffmpeg binary not found. On Heroku add buildpack heroku-community/apt (with Aptfile) or set FFMPEG_BIN. Ensure optional ffmpeg-static installed for this platform.",
  );
}

async function getFfmpegCommand(): Promise<Ffmpeg.FfmpegCommand> {
  const ffmpegMod = await import("fluent-ffmpeg");
  const ffmpeg = ffmpegMod.default;
  ffmpeg.setFfmpegPath(resolveFfmpegBinaryPath());
  return ffmpeg as unknown as Ffmpeg.FfmpegCommand;
}

/**
 * Run ffmpeg via temp files (reliable for large audio/video on servers).
 */
async function convertWithFfmpegFiles(
  input: Buffer,
  inputExt: string,
  outputExt: string,
  configure: (command: Ffmpeg.FfmpegCommand) => Ffmpeg.FfmpegCommand,
  unavailableMessage: string,
): Promise<Buffer> {
  if (!isFfmpegConversionAvailable()) {
    throw new Error(unavailableMessage);
  }

  const ffmpeg = await getFfmpegCommand();
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-ff-"));
  const inPath = path.join(tmp, `input.${inputExt.replace(/^\./, "")}`);
  const outPath = path.join(tmp, `output.${outputExt.replace(/^\./, "")}`);

  try {
    await fs.writeFile(inPath, input);

    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(inPath);
      command = configure(command);
      command
        .output(outPath)
        .on("start", (cmd) => console.log("[ffmpeg]", cmd))
        .on("error", (err) => reject(err))
        .on("end", () => resolve())
        .run();
    });

    const out = await fs.readFile(outPath);
    if (!out.length) {
      throw new Error("ffmpeg produced empty output");
    }
    return out;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Format Sets ────────────────────────────────────────────────────────────
/** All image formats listed in formats.ts (39 UI entries). */
export const imageInputFormats = new Set(
  formats.filter((f) => f.category === "image").map((f) => f.ext),
);
// Helper: encode raw RGBA pixel data to BMP format
function encodeBmp(data: Buffer, width: number, height: number): Buffer {
  const rowSize = Math.ceil((width * 3) / 4) * 4; // BMP rows are 4-byte aligned
  const pixelDataSize = rowSize * height;
  const fileSize = 14 + 40 + pixelDataSize;
  const buf = Buffer.alloc(fileSize);
  // BITMAPFILEHEADER
  buf.write("BM", 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(14 + 40, 10);
  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelDataSize, 34);
  // Pixel data (BGR format, bottom-up rows)
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // BMP is bottom-up
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 4;
      const dstIdx = 14 + 40 + y * rowSize + x * 3;
      buf[dstIdx] = data[srcIdx + 2];     // B
      buf[dstIdx + 1] = data[srcIdx + 1]; // G
      buf[dstIdx + 2] = data[srcIdx];     // R
    }
  }
  return buf;
}

// Helper: encode raw RGBA pixel data to ICO format
function encodeIco(data: Buffer, width: number, height: number): Buffer {
  const bmpData = encodeBmp(data, width, height);
  // ICO header: reserved(2) + type(2=1 for ICO) + count(2)
  // ICO dir entry: w(1) h(1) colors(1) reserved(1) planes(2) bpp(2) size(4) offset(4)
  const headerSize = 6;
  const dirEntrySize = 16;
  const bmpOffset = headerSize + dirEntrySize;
  const icoSize = bmpOffset + bmpData.length;
  const ico = Buffer.alloc(icoSize);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  // Directory entry
  ico.writeUInt8(width >= 256 ? 0 : width, 6);
  ico.writeUInt8(height >= 256 ? 0 : height, 7);
  ico.writeUInt8(0, 8);
  ico.writeUInt8(0, 9);
  ico.writeUInt16LE(1, 10);
  ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(bmpData.length, 14);
  ico.writeUInt32LE(bmpOffset, 18);
  bmpData.copy(ico, bmpOffset);
  return ico;
}

/** Formats convertImage can encode (must match formats.ts imgOutputSupported). */
export const imageOutputFormats = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "bmp",
  "gif",
  "tiff",
  "tif",
  "ico",
  "cur",
  "pdf",
  "svg",
]);

function wrapIcoAsCur(ico: Buffer): Buffer {
  const cur = Buffer.from(ico);
  cur.writeUInt16LE(2, 2);
  return cur;
}

/** Prepare input bytes for sharp (delegates to image-decode for exotic formats). */
async function normalizeImageInput(
  input: Buffer,
  inputExt: string,
): Promise<Buffer> {
  return decodeImageToPng(input, inputExt);
}

const dataFormats = new Set([
  "csv",
  "dta",
  "env",
  "feather",
  "fwf",
  "ini",
  "json",
  "jsonl",
  "ods",
  "parquet",
  "sav",
  "sqlite",
  "toml",
  "tsv",
  "xls",
  "xlsx",
  "xml",
  "yaml",
  "yml",
  "vcf",
]);

/** Data outputs the converter actually produces (must match formats.ts dataOutputSupported). */
export const dataOutputFormats = new Set([
  "csv",
  "tsv",
  "json",
  "jsonl",
  "yaml",
  "yml",
  "xml",
  "html",
  "ini",
  "toml",
  "env",
  "xlsx",
  "xls",
  "ods",
  "vcf",
  "fwf",
  "pdf",
  "txt",
  "md",
  "parquet",
]);

const dataBinaryReadableFormats = new Set([
  "dta",
  "feather",
  "parquet",
  "sav",
  "sqlite",
]);

const dataBinaryUnsupportedFormats = new Set(["orc", "toon", "xpt"]); // kept for direct/API safety

/** Subtitle outputs (must match formats.ts subtitle targets). */
export const subtitleOutputFormats = new Set([
  "srt",
  "vtt",
  "ass",
  "ssa",
  "sub",
  "mpl",
]);

/** Archive outputs the converter actually produces. */
export const archiveOutputFormats = new Set([
  "zip",
  "cbz",
  "tar",
  "tar.gz",
  "tar.bz2",
  "tar.xz",
  "tar.zst",
  "7z",
  "rar",
]);

/** Presentation outputs (must match formats.ts presOutputSupported). */
export const presentationOutputFormats = new Set([
  "html",
  "htm",
  "jpeg",
  "jpg",
  "png",
  "odp",
  "pdf",
  "pptx",
  "txt",
]);

/** Ebook text/document outputs (binary Kindle/Sony formats are not generated). */
export const ebookOutputFormats = new Set([
  "txt",
  "md",
  "html",
  "htm",
  "pdf",
  "epub",
  "docx",
  "odt",
  "rtf",
  "tex",
  "textile",
  "adoc",
  "org",
  "rst",
  "opml",
  "muse",
  "ipynb",
  "pptx",
]);

/** Font outputs (must match formats.ts font targets). */
export const fontOutputFormats = new Set(["ttf", "woff2"]);

const docFormats = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "md",
  "html",
  "htm",
  "rtf",
  "adoc",
  "ipynb",
  "muse",
  "odt",
  "opml",
  "org",
  "rst",
  "tex",
  "textile",
  "eml",
  "msg",
]);

/** Document outputs the converter actually produces (must match formats.ts docOutputSupported). */
export const docOutputFormats = new Set([
  "doc",
  "txt",
  "md",
  "html",
  "htm",
  "pdf",
  "docx",
  "odt",
  "rtf",
  "tex",
  "textile",
  "adoc",
  "org",
  "rst",
  "opml",
  "muse",
  "ipynb",
  "epub",
  "pptx",
  "json",
  "yaml",
  "xml",
  "csv",
  "tsv",
]);

const audioFormats = new Set([
  "mp3",
  "wav",
  "ogg",
  "aac",
  "flac",
  "m4a",
  "wma",
  "opus",
]);

export const videoFormats = new Set([
  "mp4",
  "webm",
  "avi",
  "mkv",
  "mov",
  "wmv",
  "flv",
  "m4v",
  "mpeg",
  "mpg",
  "3gp",
  "ogv",
  "ts",
]);

const ebookFormats = new Set([
  "azw3",
  "cb7",
  "cbr",
  "cbz",
  "epub",
  "fb2",
  "lrf",
  "mobi",
  "pdb",
  "snb",
]);

const calibrePreferredInputs = new Set([
  "azw3",
  "mobi",
  "lrf",
  "pdb",
  "snb",
  "epub",
  "fb2",
]);

const presFormats = new Set([
  "key",
  "odp",
  "pot",
  "potx",
  "pps",
  "ppsx",
  "ppt",
  "pptm",
  "pptx",
]);

const subFormats = new Set(["ass", "mpl", "srt", "ssa", "sub", "vtt"]);

const fontFormats = new Set(["otf", "ttf", "woff", "woff2"]);

const archiveFormats = new Set([
  "7z",
  "rar",
  "tar",
  "tar.bz2",
  "tar.gz",
  "tar.xz",
  "tar.zst",
  "zip",
  "gz",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export async function textToPdf(text: string, _title: string = "Document"): Promise<Buffer> {
  const sanitizedText = (text || "[No Content]")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .slice(0, 100000);

  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const { loadPdfUnicodeFontBytes } = await import("@/lib/pdf-utils");
    const fontBytes = await loadPdfUnicodeFontBytes();
    const font = await pdfDoc.embedFont(fontBytes);
    const fontSize = 11;
    const margin = 50;
    const pageWidth = 595.28 - margin * 2;
    const lineHeight = fontSize * 1.4;

    const lines: string[] = [];
    for (const para of sanitizedText.split("\n")) {
      const words = para.split(/\s+/);
      let line = "";
      for (const word of words) {
        if (!word) continue;
        const test = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(test, fontSize) > pageWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      lines.push(""); // paragraph break
    }

    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    let y = 841.89 - margin;

    for (const line of lines) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 841.89 - margin;
      }
      if (line === "") {
        y -= lineHeight * 0.5;
        continue;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    throw new Error(`Failed to generate PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

function htmlToText(html: string): string {
  return turndown.turndown(html);
}

function mdToHtml(md: string): string {
  return marked(md, { async: false }) as string;
}

function wrapHtml(content: string, title: string = "Document"): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1a1a1a;}h1,h2,h3{margin-top:1.5em;}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em;}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;}th{background:#f8f8f8;}</style></head><body>${content}</body></html>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-zA-Z]+;/g, (m) => he.decode(m))
    .replace(/\s+/g, " ")
    .trim();
}

function toRtf(text: string): string {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}");
  const lines = escaped
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs22\n${lines.map((l) => `\\par ${l}`).join("\n")}\n\\par}`;
}

function toTex(text: string): string {
  const escaped = text.replace(/[&%$#_{}~^\\]/g, (m) => `\\${m}`);
  const lines = escaped.split("\n");
  let result =
    "\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{hyperref}\n\\begin{document}\n";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) result += `\\section{${trimmed.slice(2)}}\n`;
    else if (trimmed.startsWith("## "))
      result += `\\subsection{${trimmed.slice(3)}}\n`;
    else if (trimmed.startsWith("### "))
      result += `\\subsubsection{${trimmed.slice(4)}}\n`;
    else if (trimmed) result += `${trimmed}\n\n`;
  }
  result += "\\end{document}";
  return result;
}

function toTextile(text: string): string {
  return text
    .replace(/^### (.+)$/gm, "h3. $1")
    .replace(/^## (.+)$/gm, "h2. $1")
    .replace(/^# (.+)$/gm, "h1. $1")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/\*(.+?)\*/g, "_$1_");
}

function toAdoc(text: string): string {
  return text
    .replace(/^# (.+)$/gm, "= $1")
    .replace(/^## (.+)$/gm, "== $1")
    .replace(/^### (.+)$/gm, "=== $1")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/\*(.+?)\*/g, "_$1_");
}

function toOrg(text: string): string {
  return text
    .replace(/^# (.+)$/gm, "* $1")
    .replace(/^## (.+)$/gm, "** $1")
    .replace(/^### (.+)$/gm, "*** $1")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/\*(.+?)\*/g, "/$1/");
}

function toRst(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("# ")) {
      const title = trimmed.slice(2);
      result.push(title);
      result.push("=".repeat(title.length));
      result.push("");
    } else if (trimmed.startsWith("## ")) {
      const title = trimmed.slice(3);
      result.push(title);
      result.push("-".repeat(title.length));
      result.push("");
    } else {
      result.push(lines[i]);
    }
  }
  return result.join("\n");
}

function toOpml(text: string): string {
  const items = text.split("\n").filter((l) => l.trim());
  const body = items
    .map((i) => `    <outline text="${i.trim().replace(/"/g, "&quot;")}"/>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head>\n    <title>Converted Document</title>\n  </head>\n  <body>\n${body}\n  </body>\n</opml>`;
}

function toMuse(text: string): string {
  return text
    .replace(/^# (.+)$/gm, "** $1\n** $1")
    .replace(/^## (.+)$/gm, "* $1\n* $1")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/\*(.+?)\*/g, "_$1_");
}

function toIpynb(text: string): string {
  const lines = text.split("\n");
  const cells = lines.map((l) => ({
    cell_type: "markdown",
    metadata: {},
    source: [l + "\n"],
  }));
  return JSON.stringify(
    {
      cells,
      metadata: { kernelspec: { language: "python" } },
      nbformat: 4,
      nbformat_minor: 5,
    },
    null,
    2,
  );
}

// ─── CSV/TSV/Data parsing ──────────────────────────────────────────────────
function parseCsv(
  text: string,
  delimiter: string = ",",
): Record<string, string>[] {
  return csvParse(text, {
    columns: true,
    skip_empty_lines: true,
    delimiter,
    relax_quotes: true,
    relax_column_count: true,
  });
}

function toCsv(data: Record<string, unknown>[]): string {
  if (!Array.isArray(data) || data.length === 0) return "";
  return csvStringify(data, { header: true });
}

function toTsv(data: Record<string, unknown>[]): string {
  if (!Array.isArray(data) || data.length === 0) return "";
  return csvStringify(data, { header: true, delimiter: "\t" });
}

function parseFwf(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const cols: { start: number; end: number }[] = [];
  const header = lines[0];
  let inCol = false,
    start = 0;
  for (let i = 0; i <= header.length; i++) {
    const isSpace = i === header.length || header[i] === " ";
    if (inCol && isSpace) {
      cols.push({ start, end: i });
      inCol = false;
    } else if (!inCol && !isSpace) {
      start = i;
      inCol = true;
    }
  }
  return lines.slice(1).map((line) => {
    const row: Record<string, string> = {};
    cols.forEach((c, _i) => {
      row[header.slice(c.start, c.end).trim()] = line
        .slice(c.start, c.end)
        .trim();
    });
    return row;
  });
}

function parseVcf(text: string): Record<string, string>[] {
  const contacts: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VCARD") {
      current = {};
      continue;
    }
    if (trimmed === "END:VCARD") {
      if (Object.keys(current).length > 0) contacts.push(current);
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      current[trimmed.slice(0, colonIdx)] = trimmed.slice(colonIdx + 1);
    }
  }
  return contacts;
}

function toVcf(data: Record<string, string>[]): string {
  return data
    .map((d) => {
      let vcard = "BEGIN:VCARD\nVERSION:3.0\n";
      if (d.FN) vcard += `FN:${d.FN}\n`;
      if (d.N) vcard += `N:${d.N}\n`;
      if (d.TEL) vcard += `TEL:${d.TEL}\n`;
      if (d.EMAIL) vcard += `EMAIL:${d.EMAIL}\n`;
      if (d.ADR) vcard += `ADR:${d.ADR}\n`;
      if (d.ORG) vcard += `ORG:${d.ORG}\n`;
      if (d.TITLE) vcard += `TITLE:${d.TITLE}\n`;
      if (d.URL) vcard += `URL:${d.URL}\n`;
      if (d.NOTE) vcard += `NOTE:${d.NOTE}\n`;
      for (const [k, v] of Object.entries(d)) {
        if (
          ![
            "FN",
            "N",
            "TEL",
            "EMAIL",
            "ADR",
            "ORG",
            "TITLE",
            "URL",
            "NOTE",
          ].includes(k)
        )
          vcard += `${k}:${v}\n`;
      }
      vcard += "END:VCARD";
      return vcard;
    })
    .join("\n");
}

function parseIni(text: string): Record<string, Record<string, string>> {
  return ini.parse(text);
}

function toIni(data: Record<string, unknown>): string {
  return ini.stringify(data as Record<string, string | Record<string, string>>);
}

function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      result[key] = val;
    }
  }
  return result;
}

function toEnv(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
}

function parseJsonl(text: string): Record<string, unknown>[] {
  return text
    .trim()
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function toJsonl(data: Record<string, unknown>[]): string {
  return data.map((d) => JSON.stringify(d)).join("\n");
}

function parseYamlRecords(text: string): Record<string, unknown>[] {
  const parsed: unknown = jsYaml.load(text);
  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    if (arrayKey) {
      return obj[arrayKey] as Record<string, unknown>[];
    }
    return [obj];
  }
  return [{ value: parsed }];
}

function recordsFromXmlNode(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    return node.map((item) =>
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)
        : { value: item },
    );
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    if (arrayKey) {
      const arr = obj[arrayKey] as unknown[];
      return arr.map((item) =>
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : { value: item },
      );
    }
    return [obj];
  }
  return [{ value: node }];
}

function xmlToRecords(parsed: unknown): Record<string, unknown>[] {
  if (!parsed || typeof parsed !== "object") {
    return [{ value: parsed }];
  }
  const obj = parsed as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("?") || key === "#text") continue;
    if (value !== null && typeof value === "object") {
      const records = recordsFromXmlNode(value);
      if (records.length > 0 && !(records.length === 1 && "@_version" in records[0])) {
        return records;
      }
    }
  }
  return recordsFromXmlNode(parsed);
}

function recordsToMarkdownTable(records: Record<string, unknown>[]): string {
  if (!records.length) return "";
  const headers = Object.keys(records[0]);
  const headerRow = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const rows = records.map(
    (r) =>
      `| ${headers.map((h) => String(r[h] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`,
  );
  return [headerRow, sep, ...rows].join("\n");
}

// ─── Subtitle Parsers ───────────────────────────────────────────────────────
interface SubtitleEntry {
  index: number;
  start: string;
  end: string;
  text: string;
}

function parseSrt(text: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = text.trim().replace(/\r\n/g, "\n").split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;
    
    // Some SRTs might have an index line, some might not
    let timeLineIdx = 0;
    if (/^\d+$/.test(lines[0])) timeLineIdx = 1;
    
    const timeLine = lines[timeLineIdx];
    const timeMatch = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2})[.,](\d{3})/,
    );
    if (!timeMatch) continue;
    
    entries.push({
      index: entries.length + 1,
      start: `${timeMatch[1].padStart(8, "0")},${timeMatch[2]}`,
      end: `${timeMatch[3].padStart(8, "0")},${timeMatch[4]}`,
      text: lines.slice(timeLineIdx + 1).join("\n"),
    });
  }
  return entries;
}

function parseVtt(text: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = text
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/^WEBVTT.*\n*/m, "")
    .split(/\n\s*\n/);
    
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    
    let timeLineIdx = 0;
    if (/^\d+$/.test(lines[0]) || !lines[0].includes("-->")) timeLineIdx = 1;
    
    const timeLine = lines[timeLineIdx] || "";
    // VTT times can be HH:MM:SS.mmm or MM:SS.mmm
    const timeMatch = timeLine.match(
      /(?:(\d{2}):)?(\d{2}:\d{2})\.(\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}:\d{2})\.(\d{3})/,
    );
    if (!timeMatch) continue;
    
    const formatTime = (h: string | undefined, ms: string, mmm: string) => {
      const hours = h || "00";
      return `${hours}:${ms},${mmm}`;
    };

    entries.push({
      index: entries.length + 1,
      start: formatTime(timeMatch[1], timeMatch[2], timeMatch[3]),
      end: formatTime(timeMatch[4], timeMatch[5], timeMatch[6]),
      text: lines.slice(timeLineIdx + 1).join("\n"),
    });
  }
  return entries;
}

function parseAss(text: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let idx = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("Dialogue:")) {
      idx++;
      const parts = line.slice(9).split(",");
      if (parts.length >= 10) {
        entries.push({
          index: idx,
          start: parts[1].trim(),
          end: parts[2].trim(),
          text: parts
            .slice(9)
            .join(",")
            .replace(/\{[^}]*\}/g, ""),
        });
      }
    }
  }
  return entries;
}

function parseSsa(text: string): SubtitleEntry[] {
  return parseAss(text); // SSA is essentially the same format
}

function parseSub(text: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const lines = text.trim().split("\n");
  if (lines.length < 2) return entries;
  const fps = parseFloat(lines[0]) || 23.976;
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length >= 3) {
      const startFrame = parseInt(parts[0], 10);
      const endFrame = parseInt(parts[1], 10);
      const toTime = (f: number) => {
        const totalSec = f / fps;
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = Math.floor(totalSec % 60);
        const ms = Math.round((totalSec % 1) * 1000);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };
      entries.push({
        index: i,
        start: toTime(startFrame),
        end: toTime(endFrame),
        text: parts.slice(2).join("|"),
      });
    }
  }
  return entries;
}

function parseMpl(text: string): SubtitleEntry[] {
  // MPL format: [start_time][end_time]text
  const entries: SubtitleEntry[] = [];
  let idx = 0;
  const regex = /\[(\d+):(\d+):(\d+)\]\[(\d+):(\d+):(\d+)\](.+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    idx++;
    const start = `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}:${match[3].padStart(2, "0")},000`;
    const end = `${match[4].padStart(2, "0")}:${match[5].padStart(2, "0")}:${match[6].padStart(2, "0")},000`;
    entries.push({ index: idx, start, end, text: match[7].trim() });
  }
  return entries;
}

function toSrt(entries: SubtitleEntry[]): string {
  return (
    entries
      .map((e, i) => `${i + 1}\n${e.start} --> ${e.end}\n${e.text}`)
      .join("\n\n") + "\n"
  );
}

function toVtt(entries: SubtitleEntry[]): string {
  const convertTime = (t: string) => t.replace(",", ".");
  return (
    "WEBVTT\n\n" +
    entries
      .map(
        (e, i) =>
          `${i + 1}\n${convertTime(e.start)} --> ${convertTime(e.end)}\n${e.text}`,
      )
      .join("\n\n") +
    "\n"
  );
}

function toAss(entries: SubtitleEntry[]): string {
  return (
    "[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,Arial,20,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n" +
    entries
      .map(
        (e) =>
          `Dialogue: 0,${e.start.replace(",", ".")},${e.end.replace(",", ".")},Default,,0,0,0,,${e.text}`,
      )
      .join("\n")
  );
}

function toSsa(entries: SubtitleEntry[]): string {
  return toAss(entries); // SSA uses same format
}

function toSub(entries: SubtitleEntry[]): string {
  return entries.map((e) => e.text.replace(/\n/g, "|")).join("\n");
}

function toMpl(entries: SubtitleEntry[]): string {
  return entries
    .map((e) => {
      const parse = (t: string) => {
        const p = t.split(":");
        return p.join(":");
      };
      return `[${parse(e.start)}][${parse(e.end)}]${e.text}`;
    })
    .join("\n");
}

// ─── Image Converter (sharp) ──────────────────────────────────────────────
async function convertImage(
  input: Buffer,
  inputExt: string,
  outputExt: string,
  quality: number = 85,
  width?: number | null,
  height?: number | null,
): Promise<Buffer> {
  const target =
    outputExt.toLowerCase() === "jpeg"
      ? "jpg"
      : outputExt.toLowerCase() === "tif"
        ? "tiff"
        : outputExt.toLowerCase();

  if (!imageOutputFormats.has(target)) {
    throw new Error(
      `Image output .${outputExt.toUpperCase()} is not supported. Supported: ${[...imageOutputFormats].sort().join(", ")}`,
    );
  }

  const prepared = await normalizeImageInput(input, inputExt);
  const density = inputExt.toLowerCase() === "svg" ? 300 : undefined;
  let pipeline = sharp(prepared, { failOn: "none", density }).rotate();

  if (width && height) pipeline = pipeline.resize(width, height, { fit: "fill" });
  else if (width) pipeline = pipeline.resize(width, null, { fit: "inside" });
  else if (height) pipeline = pipeline.resize(null, height, { fit: "inside" });

  try {
    switch (target) {
      case "png":
        return pipeline.png().toBuffer();
      case "jpg":
        return pipeline.jpeg({ quality }).toBuffer();
      case "webp":
        return pipeline.webp({ quality }).toBuffer();
      case "avif":
        return pipeline.avif({ quality }).toBuffer();
      case "bmp": {
        const { data, info } = await pipeline
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        return encodeBmp(data, info.width, info.height);
      }
      case "gif":
        return pipeline.gif().toBuffer();
      case "tiff":
        return pipeline.tiff().toBuffer();
      case "ico":
      case "cur": {
        const { data, info } = await pipeline
          .resize(32, 32, {
            fit: "contain",
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const ico = encodeIco(data, info.width, info.height);
        return target === "cur" ? wrapIcoAsCur(ico) : ico;
      }
      case "svg": {
        const pngBuf = await pipeline.png().toBuffer();
        const meta = await sharp(pngBuf).metadata();
        const w = meta.width || 1;
        const h = meta.height || 1;
        const b64 = pngBuf.toString("base64");
        return Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image width="${w}" height="${h}" href="data:image/png;base64,${b64}"/></svg>`,
        );
      }
      case "pdf": {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width: imgW, height: imgH } = await pipeline.metadata();
        const pngBuf = await pipeline.png().toBuffer();
        const image = await pdfDoc.embedPng(pngBuf);
        const margin = 50;
        const maxWidth = 595.28 - margin * 2;
        const maxHeight = 841.89 - margin * 2;
        let finalWidth = imgW || maxWidth;
        let finalHeight = imgH || maxHeight;
        const ratio = Math.min(maxWidth / finalWidth, maxHeight / finalHeight);
        finalWidth *= ratio;
        finalHeight *= ratio;
        page.drawImage(image, {
          x: (595.28 - finalWidth) / 2,
          y: (841.89 - finalHeight) / 2,
          width: finalWidth,
          height: finalHeight,
        });
        return Buffer.from(await pdfDoc.save());
      }
      default:
        throw new Error(`Unsupported image output: ${target}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to convert ${inputExt.toUpperCase()} to ${outputExt.toUpperCase()}: ${msg}`,
    );
  }
}

// ─── Data Converter ────────────────────────────────────────────────────────
async function convertData(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const text = input.toString("utf-8");
  const src = inputExt.toLowerCase();
  const dest =
    outputExt.toLowerCase() === "htm" ? "html" : outputExt.toLowerCase();

  if (!dataOutputFormats.has(dest)) {
    throw new Error(
      `Data output .${outputExt.toUpperCase()} is not supported. Supported: ${[...dataOutputFormats].sort().join(", ")}`,
    );
  }

  if (dataBinaryUnsupportedFormats.has(src)) {
    throw new Error(
      `Reading ${src.toUpperCase()} files is not supported. Try JSON, CSV, TSV, YAML, XML, or XLSX.`,
    );
  }

  // Parse source into array of records
  let records: Record<string, unknown>[] = [];

  if (src === "json") {
    const parsed = JSON.parse(text);
    records = Array.isArray(parsed) ? parsed : [parsed];
  } else if (src === "jsonl") {
    records = parseJsonl(text);
  } else if (src === "csv") {
    records = parseCsv(text, ",");
  } else if (src === "tsv") {
    records = parseCsv(text, "\t");
  } else if (src === "yaml" || src === "yml") {
    records = parseYamlRecords(text);
  } else if (src === "xml") {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        parseAttributeValue: true,
        ignoreDeclaration: true,
      });
      records = xmlToRecords(parser.parse(text));
    } catch (err) {
      console.error("XML Parsing Error:", err);
      throw new Error(
        `Failed to parse XML: ${err instanceof Error ? err.message : "invalid XML"}`,
      );
    }
  } else if (src === "toml") {
    const parsed = toml.parse(text);
    records = [{ ...parsed }];
  } else if (src === "ini") {
    const parsed = parseIni(text);
    // Flatten INI sections
    const flat: Record<string, unknown>[] = [];
    for (const [section, vals] of Object.entries(parsed)) {
      flat.push({ _section: section, ...(vals as Record<string, string>) });
    }
    records = flat;
  } else if (src === "env") {
    records = [parseEnv(text)];
  } else if (src === "fwf") {
    records = parseFwf(text);
  } else if (src === "vcf") {
    records = parseVcf(text);
  } else if (src === "html") {
    records = [{ content: stripHtml(text) }];
  } else if (src === "xlsx" || src === "xls" || src === "ods") {
    try {
      const wb = XLSX.read(input, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      if (!records.length) {
        throw new Error("Spreadsheet has no data rows");
      }
    } catch (err) {
      throw new Error(
        `Failed to read ${src.toUpperCase()}: ${err instanceof Error ? err.message : "invalid spreadsheet"}`,
      );
    }
  } else if (dataBinaryReadableFormats.has(src)) {
    records = await readBinaryDataRecords(input, src);
  } else {
    records = [{ content: text }];
  }

  // Serialize to target
  switch (dest) {
    case "json":
      return Buffer.from(JSON.stringify(records, null, 2), "utf-8");
    case "jsonl":
      return Buffer.from(toJsonl(records), "utf-8");
    case "csv":
      return Buffer.from(toCsv(records), "utf-8");
    case "tsv":
      return Buffer.from(toTsv(records), "utf-8");
    case "yaml":
    case "yml":
      return Buffer.from(
        jsYaml.dump(records.length === 1 ? records[0] : records),
        "utf-8",
      );
    case "xml": {
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        indentBy: "  ",
      });
      const xmlStr = builder.build({ root: records });
      return Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>\n${xmlStr}`,
        "utf-8",
      );
    }
    case "toml":
      return Buffer.from(
        (toml.stringify as (data: Record<string, unknown>) => string)(
          records.length === 1
            ? (records[0] as Record<string, unknown>)
            : { items: records },
        ),
        "utf-8",
      );
    case "ini":
      return Buffer.from(
        toIni(records.length === 1 ? records[0] : { data: records }),
        "utf-8",
      );
    case "env":
      return Buffer.from(
        toEnv(records.length === 1 ? records[0] : { ...records }),
        "utf-8",
      );
    case "html": {
      const rows = records
        .map(
          (r) =>
            `<tr>${Object.values(r)
              .map((v) => `<td>${v}</td>`)
              .join("")}</tr>`,
        )
        .join("");
      const headers =
        records.length > 0
          ? Object.keys(records[0])
              .map((k) => `<th>${k}</th>`)
              .join("")
          : "";
      return Buffer.from(
        wrapHtml(
          `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`,
          "Data",
        ),
        "utf-8",
      );
    }
    case "xlsx":
    case "xls":
    case "ods": {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(records);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const bookType =
        dest === "ods" ? "ods" : dest === "xls" ? "biff8" : "xlsx";
      const buf = XLSX.write(wb, {
        bookType: bookType as XLSX.BookType,
        type: "array",
      });
      return Buffer.from(buf as number[]);
    }
    case "vcf":
      return Buffer.from(toVcf(records as Record<string, string>[]), "utf-8");
    case "fwf": {
      if (!records.length) return Buffer.from("", "utf-8");
      const keys = Object.keys(records[0]);
      const widths = keys.map((k) =>
        Math.max(k.length, ...records.map((r) => String(r[k] ?? "").length)),
      );
      const header = keys
        .map((k, i) => k.padEnd(widths[i] + 2))
        .join("")
        .trimEnd();
      const rows = records.map((r) =>
        keys
          .map((k, i) => String(r[k] ?? "").padEnd(widths[i] + 2))
          .join("")
          .trimEnd(),
      );
      return Buffer.from([header, ...rows].join("\n"), "utf-8");
    }
    case "txt":
      return Buffer.from(
        toCsv(records) || JSON.stringify(records, null, 2),
        "utf-8",
      );
    case "md":
      return Buffer.from(recordsToMarkdownTable(records), "utf-8");
    case "pdf":
      return textToPdf(
        toCsv(records) || JSON.stringify(records, null, 2),
        "Data",
      );
    case "parquet":
      return writeParquetBuffer(records);
    default:
      throw new Error(
        `Data conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not implemented`,
      );
  }
}

// ─── Document Text Extraction ──────────────────────────────────────────
async function extractDocumentText(
  input: Buffer,
  inputExt: string,
): Promise<string> {
  const src = inputExt.toLowerCase();

  if (src === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer: input });
      return result.value || "Document content";
    } catch (err) {
      console.error("DOCX extraction error:", err);
      return "[Error extracting DOCX content]";
    }
  }

  if (src === "doc") {
    try {
      return (await extractDocText(input)) || "[Empty DOC document]";
    } catch (err) {
      console.error("DOC extraction error:", err);
      return "[Error extracting DOC content]";
    }
  }

  if (src === "msg") {
    try {
      return await extractMsgText(input);
    } catch (err) {
      console.error("MSG extraction error:", err);
      return "[Error extracting MSG content]";
    }
  }

  if (src === "pdf") {
    const { extractPdfText } = await import("@/lib/pdf-utils");
    return extractPdfText(input);
  }

  if (src === "odt") {
    try {
      const zip = await JSZip.loadAsync(input);
      const contentXml = await zip.file("content.xml")?.async("string");
      if (!contentXml) return "[Empty ODT document]";
      const text = contentXml
        .replace(/<text:line-break\/>/g, "\n")
        .replace(/<text:p[^>]*>/g, "\n")
        .replace(/<text:span[^>]*>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return text || "[ODT with no text content]";
    } catch (err) {
      console.error("ODT extraction error:", err);
      return "[Error extracting ODT content]";
    }
  }

  return "";
}

// ─── Document Converter ────────────────────────────────────────────────────
async function convertDocument(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest =
    outputExt.toLowerCase() === "htm" ? "html" : outputExt.toLowerCase();

  if (!docOutputFormats.has(dest)) {
    throw new Error(
      `Document output .${outputExt.toUpperCase()} is not supported. Supported: ${[...docOutputFormats].sort().join(", ")}`,
    );
  }

  if (dest === "doc") {
    const docxBuffer = await convertDocument(input, inputExt, "docx");
    const viaLibreOffice = await convertViaLibreOffice(
      docxBuffer,
      "docx",
      "doc",
      "MS Word 97",
    );
    if (viaLibreOffice) return viaLibreOffice;
    throw new Error(libreOfficeUnavailableMessage());
  }

  // Extract text from binary document formats first
  let plainText = "";
  if (src === "docx" || src === "pdf" || src === "doc" || src === "odt") {
    plainText = await extractDocumentText(input, src);
  } else if (src === "xlsx" || src === "xls" || src === "ods") {
    if (src === "xlsx" || src === "xls") {
      try {
        const wb = XLSX.read(input, { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        plainText = JSON.stringify(data, null, 2);
      } catch {
        plainText = "[Error reading spreadsheet]";
      }
    } else {
      plainText = "[Binary spreadsheet content]";
    }
  } else if (src === "pptx" || src === "ppt") {
    // Use presentation text extractor
    plainText = await extractPresentationText(input, src);
  } else {
    const text = input.toString("utf-8");

    if (src === "html" || src === "htm") {
      plainText = dest === "html" ? text : htmlToText(text);
    } else if (src === "md") {
      plainText = text;
    } else if (src === "msg") {
      plainText = await extractMsgText(input);
    } else if (src === "eml") {
      const bodyMatch =
        text.match(/<body[^>]*>([\s\S]*?)<\/body>/i) ||
        text.match(/\n\n([\s\S]*)$/);
      plainText = bodyMatch ? htmlToText(bodyMatch[1] || bodyMatch[0]) : text;
    } else if (src === "ipynb") {
      try {
        const nb = JSON.parse(text);
        plainText = (nb.cells || [])
          .map((c: { source?: string[] }) => (c.source || []).join(""))
          .join("\n\n");
      } catch {
        plainText = text;
      }
    } else if (
      src === "json" ||
      src === "xml" ||
      src === "yaml" ||
      src === "toml"
    ) {
      plainText = text;
    } else {
      plainText = stripHtml(text);
    }
  }

  // Convert to target format
  switch (dest) {
    case "txt":
      return Buffer.from(plainText, "utf-8");
    case "md":
      if (src === "html" || src === "htm") {
        return Buffer.from(htmlToText(input.toString("utf-8")), "utf-8");
      }
      return Buffer.from(plainText, "utf-8");
    case "html":
      if (src === "md") {
        return Buffer.from(wrapHtml(mdToHtml(plainText), "Document"), "utf-8");
      }
      if (src === "rst") {
        return Buffer.from(wrapHtml(mdToHtml(plainText), "Document"), "utf-8");
      }
      if (src === "html" || src === "htm") {
        return Buffer.from(input.toString("utf-8"), "utf-8");
      }
      return Buffer.from(
        wrapHtml(
          plainText
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>"),
          "Document",
        ),
        "utf-8",
      );
    case "pdf":
      return textToPdf(plainText);
    case "json":
      return Buffer.from(
        JSON.stringify(
          {
            content: plainText,
            format: src,
            convertedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        "utf-8",
      );
    case "yaml":
      return Buffer.from(
        jsYaml.dump({ content: plainText, format: src }),
        "utf-8",
      );
    case "xml": {
      const builder = new XMLBuilder({ format: true, indentBy: "  " });
      return Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build({ document: { content: plainText, format: src } })}`,
        "utf-8",
      );
    }
    case "csv":
    case "tsv": {
      const lines = plainText.split("\n").filter((l) => l.trim());
      const sep = dest === "csv" ? "," : "\t";
      return Buffer.from(
        lines.map((l) => `"${l.replace(/"/g, '""')}"`).join(sep),
        "utf-8",
      );
    }
    case "rtf":
      return Buffer.from(toRtf(plainText), "utf-8");
    case "tex":
      return Buffer.from(toTex(plainText), "utf-8");
    case "textile":
      return Buffer.from(toTextile(plainText), "utf-8");
    case "adoc":
      return Buffer.from(toAdoc(plainText), "utf-8");
    case "org":
      return Buffer.from(toOrg(plainText), "utf-8");
    case "rst":
      return Buffer.from(toRst(plainText), "utf-8");
    case "opml":
      return Buffer.from(toOpml(plainText), "utf-8");
    case "muse":
      return Buffer.from(toMuse(plainText), "utf-8");
    case "ipynb":
      return Buffer.from(toIpynb(plainText), "utf-8");
    case "odt":
    case "docx": {
      if (dest === "docx") {
        const {
          Document,
          Paragraph,
          TextRun,
          HeadingLevel,
          Packer,
        } = await import("docx");

        const doc = new Document({
          sections: [
            {
              children: plainText.split(/\n\n+/).map((p) => {
                if (p.startsWith("# ")) {
                  return new Paragraph({
                    text: p.slice(2),
                    heading: HeadingLevel.HEADING_1,
                  });
                } else if (p.startsWith("## ")) {
                  return new Paragraph({
                    text: p.slice(3),
                    heading: HeadingLevel.HEADING_2,
                  });
                } else if (p.startsWith("### ")) {
                  return new Paragraph({
                    text: p.slice(4),
                    heading: HeadingLevel.HEADING_3,
                  });
                } else {
                  return new Paragraph({
                    children: [new TextRun(p)],
                  });
                }
              }),
            },
          ],
        });
        return Buffer.from(await Packer.toBuffer(doc));
      }
      // ODT: real OpenDocument Text using JSZip
      const odtZip = new JSZip();
      odtZip.file("mimetype", "application/vnd.oasis.opendocument.text");
      odtZip.file(
        "META-INF/manifest.xml",
        `<?xml version="1.0" encoding="UTF-8"?>\n<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">\n  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>\n  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>\n  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>\n</manifest:manifest>`,
      );
      const escapedText = plainText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const paragraphs = escapedText
        .split("\n")
        .map((line) => `<text:p text:style-name="Standard">${line}</text:p>`)
        .join("\n");
      odtZip.file(
        "content.xml",
        `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">\n<office:automatic-styles><style:style style:name="Standard" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.2cm"/><style:text-properties fo:font-size="11pt" style:font-name="Calibri"/></style:style></office:automatic-styles>\n<office:body><office:text>\n${paragraphs}\n</office:text></office:body></office:document-content>`,
      );
      odtZip.file(
        "styles.xml",
        `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" office:version="1.2"></office:document-styles>`,
      );
      return Buffer.from(await odtZip.generateAsync({ type: "arraybuffer" }));
    }
    case "pptx":
      return createPptxFromText(plainText);
    case "epub": {
      // Create minimal EPUB structure
      const zip = new JSZip();
      zip.file("mimetype", "application/epub+zip");
      zip.file(
        "META-INF/container.xml",
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      );
      zip.file(
        "OEBPS/content.opf",
        `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:${crypto.randomUUID()}</dc:identifier><dc:title>Converted Document</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="ch1"/></spine></package>`,
      );
      zip.file(
        "OEBPS/nav.xhtml",
        wrapHtml("<h1>Table of Contents</h1>", "TOC"),
      );
      zip.file(
        "OEBPS/chapter1.xhtml",
        wrapHtml(mdToHtml(plainText), "Chapter 1"),
      );
      return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
    }
    default:
      throw new Error(
        `Document conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not implemented`,
      );
  }
}

// ─── Subtitle Converter ────────────────────────────────────────────────────
async function convertSubtitle(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const text = input.toString("utf-8");
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();

  if (!subtitleOutputFormats.has(dest)) {
    throw new Error(
      `Subtitle output .${outputExt.toUpperCase()} is not supported. Supported: ${[...subtitleOutputFormats].sort().join(", ")}`,
    );
  }

  // Parse source
  let entries: SubtitleEntry[] = [];
  switch (src) {
    case "srt":
      entries = parseSrt(text);
      break;
    case "vtt":
      entries = parseVtt(text);
      break;
    case "ass":
      entries = parseAss(text);
      break;
    case "ssa":
      entries = parseSsa(text);
      break;
    case "sub":
      entries = parseSub(text);
      break;
    case "mpl":
      entries = parseMpl(text);
      break;
    default:
      entries = parseSrt(text);
  }

  // Serialize to target
  switch (dest) {
    case "srt":
      return Buffer.from(toSrt(entries), "utf-8");
    case "vtt":
      return Buffer.from(toVtt(entries), "utf-8");
    case "ass":
      return Buffer.from(toAss(entries), "utf-8");
    case "ssa":
      return Buffer.from(toSsa(entries), "utf-8");
    case "sub":
      return Buffer.from(toSub(entries), "utf-8");
    case "mpl":
      return Buffer.from(toMpl(entries), "utf-8");
    default:
      throw new Error(
        `Subtitle conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not implemented`,
      );
  }
}

// ─── Ebook Converter ───────────────────────────────────────────────────────
async function convertEbook(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest =
    outputExt.toLowerCase() === "htm" ? "html" : outputExt.toLowerCase();

  if (!ebookOutputFormats.has(dest)) {
    throw new Error(
      `Ebook output .${outputExt.toUpperCase()} is not supported. Supported: ${[...ebookOutputFormats].sort().join(", ")}`,
    );
  }

  // Prefer Calibre for Kindle/legacy and whenever available for EPUB/FB2.
  if (calibrePreferredInputs.has(src) || dest === "epub") {
    const viaCalibre = await convertViaCalibre(input, src, dest);
    if (viaCalibre && viaCalibre.length > 0) {
      return viaCalibre;
    }
    if (["azw3", "mobi", "lrf", "pdb", "snb"].includes(src)) {
      throw new Error(calibreUnavailableMessage());
    }
  }

  // Fallback: extract text from ZIP-based ebooks / FB2, then document writers.
  let text = "";
  try {
    if (src === "fb2") {
      text = await extractFb2Text(input);
    } else if (src === "epub" || src === "cbz" || src === "cb7" || src === "cbr") {
      const zip = await JSZip.loadAsync(input);
      const htmlFiles: string[] = [];
      zip.forEach((pathName, _file) => {
        if (
          pathName.endsWith(".html") ||
          pathName.endsWith(".xhtml") ||
          pathName.endsWith(".htm")
        ) {
          htmlFiles.push(pathName);
        }
      });
      const contents = await Promise.all(
        htmlFiles.map((f) => zip.file(f)?.async("string") || ""),
      );
      text = contents.map((c) => stripHtml(c)).join("\n\n");
    } else {
      text = input
        .toString("utf-8")
        .replace(/<[^>]+>/g, "")
        .replace(/&[^;]+;/g, " ")
        .trim();
    }
  } catch {
    text = input
      .toString("utf-8")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  const plain = text.trim() || "Ebook content";
  return convertDocument(Buffer.from(plain, "utf-8"), "md", dest);
}

// ─── PPTX Generator from Text ──────────────────────────────────────────────
async function createPptxFromText(text: string): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.defineLayout({ name: "LAYOUT_16x9", width: 10, height: 5.625 });

  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  // Title
  slide.addText("Converted Presentation", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.75,
    fontSize: 28,
    bold: true,
    color: "1f4788",
  });

  // Content
  const lines = text.split("\n").slice(0, 20); // First 20 lines
  let yPos = 1.5;
  for (const line of lines) {
    if (yPos > 6.5) break; // Stop if exceeding slide height
    slide.addText(line || " ", {
      x: 0.5,
      y: yPos,
      w: 9,
      h: 0.5,
      fontSize: 12,
      color: "1a1a1a",
    });
    yPos += 0.5;
  }

  const out = await pres.write({ outputType: "arraybuffer" });
  return Buffer.from(out as ArrayBuffer);
}
async function extractPresentationText(
  input: Buffer,
  inputExt: string,
): Promise<string> {
  const src = inputExt.toLowerCase();
  const zipFormats = new Set(["pptx", "ppsx", "potx", "pptm", "odp"]);

  if (zipFormats.has(src)) {
    try {
      const zip = await JSZip.loadAsync(input);
      const slideTexts: string[] = [];

      if (src === "odp") {
        const contentXml = await zip.file("content.xml")?.async("string");
        if (contentXml) {
          const cleaned = contentXml
            .replace(/<[^>]+>/g, " ")
            .replace(/&[a-zA-Z]+;/g, (m) => he.decode(m))
            .replace(/\s+/g, " ")
            .trim();
          if (cleaned) slideTexts.push(cleaned);
        }
      } else {
        const slideFiles: string[] = [];
        zip.forEach((path) => {
          if (/^ppt\/slides\/slide\d+\.xml$/i.test(path)) {
            slideFiles.push(path);
          }
        });
        slideFiles.sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/i)?.[1] || "0", 10);
          const numB = parseInt(b.match(/slide(\d+)/i)?.[1] || "0", 10);
          return numA - numB;
        });

        for (const slidePath of slideFiles) {
          const xml = await zip.file(slidePath)?.async("string");
          if (!xml) continue;
          const textContent = xml
            .replace(/<a:t>([^<]*)<\/a:t>/g, "$1 ")
            .replace(/<[^>]+>/g, "")
            .replace(/&[a-zA-Z]+;/g, (m) => he.decode(m))
            .replace(/\s+/g, " ")
            .trim();
          if (textContent) slideTexts.push(textContent);
        }
      }

      if (slideTexts.length > 0) {
        return slideTexts.join("\n\n");
      }
    } catch {
      // Fall through to plaintext extraction
    }
  }

  // Legacy binary formats (ppt, pps, pot, key) — best-effort text extraction
  const raw = input.toString("latin1");
  const extracted = raw
    .replace(/[\x00-\x1F\x7F-\x9F]/g, " ")
    .replace(/\s{3,}/g, "\n")
    .replace(/[^\x20-\x7E\n]/g, "")
    .trim();
  return extracted || "Presentation content";
}

// ─── Presentation Converter ───────────────────────────────────────────────
async function convertPresentation(
  input: Buffer,
  inputExt: string,
  outputExt: string,
  quality: number = 85,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest =
    outputExt.toLowerCase() === "htm" ? "html" : outputExt.toLowerCase();

  if (!presentationOutputFormats.has(dest)) {
    throw new Error(
      `Presentation output .${outputExt.toUpperCase()} is not supported. Supported: ${[...presentationOutputFormats].sort().join(", ")}`,
    );
  }

  // Always extract text then rewrap (no same-family byte passthrough).
  const text = await extractPresentationText(input, inputExt);

  if (
    [
      "txt",
      "md",
      "html",
      "pdf",
      "rtf",
      "tex",
      "textile",
      "docx",
      "odt",
      "json",
      "adoc",
      "org",
      "rst",
      "opml",
      "muse",
    ].includes(dest)
  ) {
    return convertDocument(Buffer.from(text, "utf-8"), "md", dest);
  }

  if (dest === "jpeg" || dest === "jpg" || dest === "png") {
    const safeText = text
      .slice(0, 200)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="640" y="360" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="24" fill="#333">${safeText}</text></svg>`;
    return convertImage(Buffer.from(svg), "svg", dest, quality);
  }

  // For pptx output from non-pptx source, generate a basic PPTX
  if (dest === "pptx") {
    const pptxZip = new JSZip();
    pptxZip.file("[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'
    );
    pptxZip.file("_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'
    );
    pptxZip.file("ppt/_rels/presentation.xml.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>'
    );
    pptxZip.file("ppt/presentation.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>'
    );
    const escapedXml = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    pptxZip.file("ppt/slides/slide1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="TextBox"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="5486400"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:t>${escapedXml}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
    );
    return Buffer.from(await pptxZip.generateAsync({ type: "arraybuffer" }));
  }

  // For ODP output, generate a basic ODP
  if (dest === "odp") {
    const odpZip = new JSZip();
    odpZip.file("mimetype", "application/vnd.oasis.opendocument.presentation");
    odpZip.file("META-INF/manifest.xml",
      '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.presentation"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>'
    );
    const escapedXml = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    odpZip.file("content.xml",
      `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" office:version="1.2"><office:body><office:presentation><draw:page draw:name="Slide1"><draw:frame draw:text-style-name="P1" presentation:style-name="pr1" draw:layer="layout"><draw:text-box><text:p>${escapedXml}</text:p></draw:text-box></draw:frame></draw:page></office:presentation></office:body></office:document-content>`
    );
    return Buffer.from(await odpZip.generateAsync({ type: "arraybuffer" }));
  }

  throw new Error(
    `Presentation conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not implemented`,
  );
}

// ─── Archive Converter ─────────────────────────────────────────────────────
async function convertArchive(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();

  if (!archiveOutputFormats.has(dest)) {
    throw new Error(
      `Archive output .${outputExt.toUpperCase()} is not supported. Supported: ${[...archiveOutputFormats].sort().join(", ")}`,
    );
  }

  let files: ArchiveEntry[] = [];
  try {
    files = await extractArchiveEntries(input, src);
  } catch (err) {
    throw new Error(
      `Failed to extract ${src.toUpperCase()} archive: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (files.length === 0) {
    files.push({ name: "archive_content", data: input });
  }

  if (dest === "7z") {
    try {
      return await packTo7zip(files);
    } catch (err) {
      throw new Error(
        `7z packing failed: ${err instanceof Error ? err.message : "unknown error"}. Ensure 7zip-min works on this host, or choose ZIP.`,
      );
    }
  }

  if (dest === "rar") {
    const rarBuffer = await createRarWithToolchain(files);
    if (rarBuffer) return rarBuffer;
    throw new Error(rarUnavailableMessage());
  }

  const buildTarBuffer = async (): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver("tar");
      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
      for (const f of files) archive.append(f.data, { name: f.name });
      archive.finalize();
    });
  };

  const compressTarWith7zip = async (
    tarBuffer: Buffer,
    archiveName: string,
  ): Promise<Buffer> => {
    const { pack } = await import("7zip-min");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-tar-"));
    const tarPath = path.join(tmp, "archive.tar");
    const outPath = path.join(tmp, archiveName);
    try {
      await fs.writeFile(tarPath, tarBuffer);
      await pack(tarPath, outPath);
      return await fs.readFile(outPath);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  };

  // Create target archive
  if (dest === "zip" || dest === "cbz") {
    const zip = new JSZip();
    for (const f of files) zip.file(f.name, f.data);
    return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
  }

  if (dest === "tar") {
    return buildTarBuffer();
  }

  if (dest === "tar.gz") {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver("tar", { gzip: true, gzipOptions: { level: 9 } });
      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
      for (const f of files) archive.append(f.data, { name: f.name });
      archive.finalize();
    });
  }

  if (dest === "tar.bz2" || dest === "tar.xz") {
    const tarBuffer = await buildTarBuffer();
    return compressTarWith7zip(tarBuffer, `archive.${dest}`);
  }

  if (dest === "tar.zst") {
    const tarBuffer = await buildTarBuffer();
    const zlib = await import("node:zlib");
    const zstdCompressSync = (
      zlib as unknown as { zstdCompressSync?: (value: Buffer) => Buffer }
    ).zstdCompressSync;
    if (typeof zstdCompressSync !== "function") {
      throw new Error(zstdUnavailableMessage());
    }
    return Buffer.from(zstdCompressSync(tarBuffer));
  }

  throw new Error(
    `Archive conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not implemented`,
  );
}

// ─── Font Converter ────────────────────────────────────────────────────────
async function convertFont(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();

  if (dest === "woff2") {
    try {
      const { compress } = await import("wawoff2");
      return Buffer.from(await compress(input));
    } catch (err) {
      throw new Error(
        `WOFF2 compression failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  if (src === "woff2" && dest === "ttf") {
    try {
      const { decompress } = await import("wawoff2");
      return Buffer.from(await decompress(input));
    } catch (err) {
      throw new Error(
        `WOFF2 decompression failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  throw new Error(
    `Font conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not supported. Supported pairs: OTF/TTF/WOFF → WOFF2, WOFF2 → TTF.`,
  );
}

// ─── Audio / Video Converter (ffmpeg, temp files) ─────────────────────────
function applyAudioCodec(
  command: Ffmpeg.FfmpegCommand,
  outputExt: string,
): Ffmpeg.FfmpegCommand {
  if (outputExt === "mp3") {
    return command.audioCodec("libmp3lame").audioBitrate("192k");
  }
  if (outputExt === "aac") {
    return command.audioCodec("aac").audioBitrate("192k");
  }
  if (outputExt === "m4a") {
    return command.audioCodec("aac").audioBitrate("192k");
  }
  if (outputExt === "ogg") {
    return command.audioCodec("libvorbis");
  }
  if (outputExt === "flac") {
    return command.audioCodec("flac");
  }
  if (outputExt === "wav") {
    return command.audioCodec("pcm_s16le");
  }
  if (outputExt === "opus") {
    return command.audioCodec("libopus");
  }
  if (outputExt === "wma") {
    return command.audioCodec("wmav2");
  }
  return command;
}

function applyVideoCodec(
  command: Ffmpeg.FfmpegCommand,
  outputExt: string,
): Ffmpeg.FfmpegCommand {
  if (outputExt === "webm") {
    return command
      .videoCodec("libvpx-vp9")
      .audioCodec("libopus")
      .outputOptions(["-b:v", "1M", "-b:a", "128k"]);
  }
  if (outputExt === "ogv") {
    return command.videoCodec("libtheora").audioCodec("libvorbis");
  }
  if (outputExt === "wmv") {
    return command.videoCodec("wmv2").audioCodec("wmav2");
  }
  // Default: H.264 + AAC in MP4-family containers (also works for many others)
  return command
    .videoCodec("libx264")
    .audioCodec("aac")
    .outputOptions(["-preset", "veryfast", "-crf", "23", "-movflags", "+faststart"]);
}

async function convertAudio(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();
  if (!audioFormats.has(dest)) {
    throw new Error(
      `Audio output .${outputExt.toUpperCase()} is not supported. Supported: ${[...audioFormats].sort().join(", ")}`,
    );
  }

  return convertWithFfmpegFiles(
    input,
    src,
    dest,
    (command) => applyAudioCodec(command.noVideo(), dest),
    audioUnavailableMessage(),
  );
}

async function convertVideo(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();

  // Video → audio extract
  if (audioFormats.has(dest)) {
    return convertWithFfmpegFiles(
      input,
      src,
      dest,
      (command) => applyAudioCodec(command.noVideo(), dest),
      videoUnavailableMessage(),
    );
  }

  if (!videoFormats.has(dest)) {
    throw new Error(
      `Video output .${outputExt.toUpperCase()} is not supported. Supported: ${[...videoFormats].sort().join(", ")}`,
    );
  }

  return convertWithFfmpegFiles(
    input,
    src,
    dest,
    (command) => applyVideoCodec(command, dest),
    videoUnavailableMessage(),
  );
}

function sniffEmbeddedExt(buf: Buffer): string {
  if (buf.length >= 4 && buf.slice(0, 4).toString() === "%PDF") return "pdf";
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return "zip";
  const head = buf.toString("utf-8", 0, Math.min(200, buf.length));
  if (head.includes("<html") || head.includes("<!DOCTYPE")) return "html";
  if (head.trim().startsWith("{")) return "json";
  return "txt";
}

async function convertDrawio(
  input: Buffer,
  outputExt: string,
  quality: number = 85,
): Promise<Buffer> {
  const dest =
    outputExt.toLowerCase() === "htm" ? "html" : outputExt.toLowerCase();
  const allowed = new Set([
    "png",
    "jpg",
    "jpeg",
    "pdf",
    "html",
    "txt",
    "md",
    "svg",
  ]);
  if (!allowed.has(dest)) {
    throw new Error(
      `DrawIO output .${outputExt.toUpperCase()} is not supported. Supported: png, pdf, html, txt, md, svg`,
    );
  }
  const { text, png } = await extractDrawioContent(input);
  if ((dest === "png" || dest === "jpg" || dest === "jpeg") && png) {
    return convertImage(png, "png", dest === "jpeg" ? "jpg" : dest, quality);
  }
  if (dest === "svg") {
    const labels = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const lines = labels
      .map((l, i) => `<text x="20" y="${24 + i * 22}" font-size="14">${l.replace(/</g, "&lt;")}</text>`)
      .join("");
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${Math.max(200, labels.length * 24)}">${lines}</svg>`,
      "utf-8",
    );
  }
  return convertDocument(Buffer.from(text, "utf-8"), "md", dest);
}

async function convertP7m(
  input: Buffer,
  outputExt: string,
  quality: number = 85,
  width?: number | null,
  height?: number | null,
): Promise<Buffer> {
  const inner = await extractP7mContent(input);
  const innerExt = sniffEmbeddedExt(inner);
  return convertFile(inner, innerExt, outputExt, quality, width, height);
}

// ─── Main Converter Entry Point ────────────────────────────────────────────
export async function convertFile(
  input: Buffer,
  inputExt: string,
  outputExt: string,
  quality: number = 85,
  width?: number | null,
  height?: number | null,
): Promise<Buffer> {
  const src = inputExt.toLowerCase().replace(/^\./, "");
  const dest = outputExt.toLowerCase().replace(/^\./, "");

  if (src === dest) {
    return input;
  }

  if (src === "pdf" && isPdfRasterTarget(dest)) {
    const { convertPdfToRasterOutput } = await import("@/lib/pdf-utils");
    const out = await convertPdfToRasterOutput(input, dest, quality);
    return out.data;
  }

  // Route to appropriate converter
  if (imageInputFormats.has(src)) {
    return convertImage(input, src, dest, quality, width, height);
  }

  if (videoFormats.has(src) && (videoFormats.has(dest) || audioFormats.has(dest))) {
    return convertVideo(input, src, dest);
  }

  if (audioFormats.has(src) && audioFormats.has(dest)) {
    return convertAudio(input, src, dest);
  }

  if (
    dataFormats.has(src) &&
    (dataFormats.has(dest) ||
      dest === "txt" ||
      dest === "md" ||
      dest === "html" ||
      dest === "pdf")
  ) {
    return convertData(input, src, dest);
  }

  if (
    docFormats.has(src) &&
    (docFormats.has(dest) ||
      dest === "epub" ||
      dest === "pptx" ||
      dest === "json" ||
      dest === "csv" ||
      dest === "yaml" ||
      dest === "xml")
  ) {
    return convertDocument(input, src, dest);
  }

  if (ebookFormats.has(src)) {
    return convertEbook(input, src, dest);
  }
  if (ebookFormats.has(dest) && (docFormats.has(src) || dataFormats.has(src))) {
    if (dest === "epub") {
      return convertDocument(input, src, "epub");
    }
    throw new Error(
      `Document to ${dest.toUpperCase()} is not supported. Try EPUB, PDF, or DOCX.`,
    );
  }

  if (presFormats.has(src)) {
    return convertPresentation(input, src, dest, quality);
  }
  if (presFormats.has(dest) && docFormats.has(src)) {
    return convertPresentation(input, src, dest, quality);
  }

  if (subFormats.has(src)) {
    return convertSubtitle(input, src, dest);
  }

  if (archiveFormats.has(src)) {
    return convertArchive(input, src, dest);
  }

  if (fontFormats.has(src)) {
    return convertFont(input, src, dest);
  }

  if (src === "drawio") {
    return convertDrawio(input, dest, quality);
  }

  if (src === "p7m") {
    return convertP7m(input, dest, quality, width, height);
  }

  throw new Error(
    `Conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not supported in this environment`,
  );
}

export { getMimeType } from "@/lib/mime-types";
