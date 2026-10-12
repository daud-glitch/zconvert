import sharp from "sharp";
import fs from "fs/promises";
import { accessSync, chmodSync, constants as fsConstants } from "fs";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";
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
  extractKindleEbookText,
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
import {
  parseSbv,
  toSbv,
  parseLrc,
  toLrc,
  parseIcs,
  toIcs,
  parseM3u,
  toM3u,
  parseGeoJson,
  toGeoJson,
  type SubtitleCue,
} from "@/lib/light-text-formats";

function ffmpegPathExists(binPath: string): boolean {
  try {
    accessSync(binPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Env without apt LD_LIBRARY_PATH — required for statically linked ffmpeg-static. */
function envWithoutAptLibs(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.LD_LIBRARY_PATH;
  delete env.LIBRARY_PATH;
  return env;
}

/** Heroku apt buildpack installs libs under ~/.apt — only needed for apt ffmpeg. */
function ensureHerokuAptPaths(): void {
  const home = process.env.HOME?.trim();
  if (!home) return;
  const aptRoot = path.join(home, ".apt");
  if (!ffmpegPathExists(aptRoot)) return;

  const libDirs = [
    path.join(aptRoot, "usr/lib/x86_64-linux-gnu"),
    path.join(aptRoot, "usr/lib/aarch64-linux-gnu"),
    path.join(aptRoot, "usr/lib"),
    path.join(aptRoot, "lib/x86_64-linux-gnu"),
    path.join(aptRoot, "lib"),
  ].filter(ffmpegPathExists);

  if (libDirs.length > 0) {
    const existing = (process.env.LD_LIBRARY_PATH || "")
      .split(":")
      .map((p) => p.trim())
      .filter(Boolean);
    process.env.LD_LIBRARY_PATH = [...libDirs, ...existing].join(":");
  }

  const aptBin = path.join(aptRoot, "usr/bin");
  if (ffmpegPathExists(aptBin)) {
    const pathParts = (process.env.PATH || "")
      .split(":")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!pathParts.includes(aptBin)) {
      process.env.PATH = [aptBin, ...pathParts].join(":");
    }
  }
}

function ffmpegBinaryRuns(
  binPath: string,
  env: NodeJS.ProcessEnv = process.env,
): { ok: boolean; detail?: string } {
  try {
    try {
      chmodSync(binPath, 0o755);
    } catch {
      // ignore chmod failures (e.g. read-only FS)
    }
    execFileSync(binPath, ["-version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
      env,
    });
    return { ok: true };
  } catch (err) {
    const detail =
      err instanceof Error
        ? err.message
        : typeof err === "object" &&
            err &&
            "status" in err &&
            typeof (err as { status?: unknown }).status === "number"
          ? `exit ${(err as { status: number }).status}`
          : String(err);
    return { ok: false, detail };
  }
}

function resolveSystemFfmpegPath(): string | null {
  const candidates: string[] = [];
  const home = process.env.HOME?.trim();
  if (home) {
    candidates.push(path.join(home, ".apt/usr/bin/ffmpeg"));
  }
  // Dedicated ffmpeg buildpacks often put the binary here
  candidates.push("/app/vendor/ffmpeg/ffmpeg", "/app/.heroku/ffmpeg/bin/ffmpeg");
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const out = execFileSync(cmd, ["ffmpeg"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: process.env,
    })
      .trim()
      .split(/\r?\n/)[0]
      ?.trim();
    if (out) candidates.push(out);
  } catch {
    // ignore
  }
  candidates.push("ffmpeg");

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate !== "ffmpeg" && !ffmpegPathExists(candidate)) continue;
    const check = ffmpegBinaryRuns(candidate);
    if (check.ok) return candidate;
    console.error("[ffmpeg] skip system candidate:", candidate, check.detail);
  }
  return null;
}

function resolveFfmpegStaticPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require("ffmpeg-static") as string | null | undefined;
    if (!ffmpegStatic) {
      console.error(
        "[ffmpeg] ffmpeg-static is null — postinstall binary download may have failed on this slug",
      );
      return null;
    }
    if (!ffmpegPathExists(ffmpegStatic)) {
      console.error("[ffmpeg] ffmpeg-static path missing:", ffmpegStatic);
      return null;
    }
    // Critical on Heroku: apt LD_LIBRARY_PATH breaks the static binary (exit 127).
    const cleanEnv = envWithoutAptLibs();
    const check = ffmpegBinaryRuns(ffmpegStatic, cleanEnv);
    if (check.ok) {
      delete process.env.LD_LIBRARY_PATH;
      delete process.env.LIBRARY_PATH;
      return ffmpegStatic;
    }
    console.error(
      "[ffmpeg] ffmpeg-static present but not runnable:",
      ffmpegStatic,
      check.detail,
    );
  } catch (err) {
    console.error("Failed to load ffmpeg-static:", err);
  }
  return null;
}

function resolveVendorFfmpegPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "vendor", "ffmpeg", "ffmpeg"),
    path.join(process.cwd(), "vendor", "ffmpeg", "ffmpeg.exe"),
    "/app/vendor/ffmpeg/ffmpeg",
  ];
  const clean = envWithoutAptLibs();
  for (const candidate of candidates) {
    if (!ffmpegPathExists(candidate)) continue;
    const check = ffmpegBinaryRuns(candidate, clean);
    if (check.ok) {
      delete process.env.LD_LIBRARY_PATH;
      delete process.env.LIBRARY_PATH;
      return candidate;
    }
    console.error("[ffmpeg] skip vendor candidate:", candidate, check.detail);
  }
  return null;
}

/**
 * Resolve ffmpeg binary.
 * Prefer vendor copy (ensure-ffmpeg.js) → ffmpeg-static → system/apt.
 */
function resolveFfmpegBinaryPath(): string {
  const envPath =
    process.env.FFMPEG_BIN?.trim() || process.env.FFMPEG_PATH?.trim();
  if (envPath) {
    if (!ffmpegPathExists(envPath)) {
      throw new Error(
        `FFMPEG_BIN/FFMPEG_PATH is set to "${envPath}" but that file was not found.`,
      );
    }
    const cleanCheck = ffmpegBinaryRuns(envPath, envWithoutAptLibs());
    if (cleanCheck.ok) {
      delete process.env.LD_LIBRARY_PATH;
      delete process.env.LIBRARY_PATH;
      return envPath;
    }
    ensureHerokuAptPaths();
    const aptCheck = ffmpegBinaryRuns(envPath);
    if (aptCheck.ok) return envPath;
    throw new Error(
      `FFMPEG_BIN/FFMPEG_PATH ("${envPath}") exists but failed to run (${cleanCheck.detail || aptCheck.detail}).`,
    );
  }

  const vendorPath = resolveVendorFfmpegPath();
  if (vendorPath) return vendorPath;

  const staticPath = resolveFfmpegStaticPath();
  if (staticPath) return staticPath;

  ensureHerokuAptPaths();
  const systemPath = resolveSystemFfmpegPath();
  if (systemPath) return systemPath;

  throw new Error(
    "ffmpeg binary not found or not runnable. Redeploy so heroku-postbuild can download vendor/ffmpeg (scripts/ensure-ffmpeg.js).",
  );
}

async function getFfmpegCommand(): Promise<Ffmpeg.FfmpegCommand> {
  const ffmpegMod = await import("fluent-ffmpeg");
  const ffmpeg = ffmpegMod.default;
  const bin = resolveFfmpegBinaryPath();
  ffmpeg.setFfmpegPath(bin);
  return ffmpeg as unknown as Ffmpeg.FfmpegCommand;
}

/**
 * Drop progress-footer noise (size=0KiB time=N/A) so operators/users see real encoder errors.
 */
function scrubFfmpegErrorMessage(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const useful = lines.filter(
    (l) =>
      /error|unknown|invalid|failed|encoder|cannot|does not|opening|unsupported/i.test(
        l,
      ) &&
      !/^size=\s*/i.test(l) &&
      !/bitrate=N\/A/i.test(l) &&
      !/speed=N\/A/i.test(l),
  );
  if (useful.length) {
    return useful.slice(-4).join(" | ").slice(0, 400);
  }
  return raw.slice(0, 400);
}

/**
 * Run ffmpeg via temp files (reliable for large audio/video on servers).
 * Always cleans temp dir; kills hung encodes so workers don't stick.
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

  if (!input?.length) {
    throw new Error("Empty media file — nothing to convert.");
  }

  // Reject obvious non-media payloads (truncated HTML error pages, JSON, etc.)
  const headAscii = input
    .subarray(0, Math.min(64, input.length))
    .toString("utf8")
    .trimStart()
    .toLowerCase();
  if (
    headAscii.startsWith("<!doctype") ||
    headAscii.startsWith("<html") ||
    headAscii.startsWith("{") ||
    headAscii.startsWith("-----begin")
  ) {
    throw new Error(
      "Uploaded data is not a media file (received text/HTML). Re-select the file and try again.",
    );
  }

  const sniffed = sniffMediaContainerExt(input);
  const srcExt = (sniffed || inputExt.replace(/^\./, "")).toLowerCase();
  const destExt = outputExt.replace(/^\./, "").toLowerCase();

  const ffmpeg = await getFfmpegCommand();
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-ff-"));
  const inPath = path.join(tmp, `input.${srcExt || "bin"}`);
  const outPath = path.join(tmp, `output.${destExt}`);

  try {
    await fs.writeFile(inPath, input);

    // Sanity: ensure bytes landed on disk
    const st = await fs.stat(inPath);
    if (st.size !== input.length || st.size === 0) {
      throw new Error(
        `Temp media write failed (expected ${input.length} bytes, got ${st.size}).`,
      );
    }

    // Long video re-encode needs more wall-clock; still kill hung jobs.
    const isVideoOut = videoFormats.has(destExt);
    const timeoutMs =
      isVideoOut && input.length > 25 * 1024 * 1024
        ? 14 * 60_000
        : isVideoOut
          ? 10 * 60_000
          : 6 * 60_000;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let command = ffmpeg(inPath);
      // Audio-only encodes: lighter probe flags (cover-art MP3s / pure streams)
      // Video: longer probe + tolerate phone/camera stream glitches
      if (audioFormats.has(destExt)) {
        command = command.inputOptions([
          "-analyzeduration",
          "50M",
          "-probesize",
          "25M",
        ]);
      } else {
        command = command.inputOptions([
          "-fflags",
          "+genpts+igndts+discardcorrupt",
          "-analyzeduration",
          "100M",
          "-probesize",
          "50M",
          "-err_detect",
          "ignore_err",
        ]);
      }
      command = configure(command);

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        finish(() => {
          try {
            // fluent-ffmpeg kill
            (command as unknown as { kill?: (s: string) => void }).kill?.(
              "SIGKILL",
            );
          } catch {
            // ignore
          }
          reject(
            new Error(
              "Conversion timed out. For long video try lower quality, a shorter clip, or convert to audio only.",
            ),
          );
        });
      }, timeoutMs);

      command
        .output(outPath)
        .on("error", (err: Error & { message?: string }) => {
          finish(() => {
            const raw = err?.message || String(err);
            if (/SIGINT|SIGKILL|killed/i.test(raw) && settled) {
              // timeout already rejected
              return;
            }
            if (
              /invalid data found when processing input|error opening input/i.test(
                raw,
              )
            ) {
              reject(
                new Error(
                  `ffmpeg could not read this ${srcExt.toUpperCase() || "media"} file (invalid/corrupt or incomplete upload, ${input.length} bytes). Re-export or re-select the file and retry.`,
                ),
              );
              return;
            }
            reject(new Error(scrubFfmpegErrorMessage(raw) || raw));
          });
        })
        .on("end", () => finish(() => resolve()))
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

/** Detect real container from magic bytes (phones often mislabel extensions). */
function sniffMediaContainerExt(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // ISO BMFF: ....ftyp (mp4/m4a/mov/3gp)
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12).toLowerCase();
    if (brand.startsWith("qt") || brand === "moov") return "mov";
    if (brand.includes("3gp")) return "3gp";
    if (
      brand.startsWith("m4a") ||
      brand === "m4a " ||
      brand.startsWith("m4b")
    ) {
      return "m4a";
    }
    return "mp4";
  }
  // EBML: WebM / Matroska
  if (
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  ) {
    const slice = buf.toString("ascii", 0, Math.min(64, buf.length));
    if (slice.includes("webm")) return "webm";
    return "mkv";
  }
  // Ogg
  if (buf.toString("ascii", 0, 4) === "OggS") return "ogg";
  // RIFF .... WAVE / AVI / WEBP
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.length >= 12) {
    const form = buf.toString("ascii", 8, 12);
    if (form === "WAVE") return "wav";
    if (form === "AVI ") return "avi";
  }
  // FLAC
  if (buf.toString("ascii", 0, 4) === "fLaC") return "flac";
  // ID3 / MPEG audio
  if (buf.toString("ascii", 0, 3) === "ID3") return "mp3";
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "mp3";
  // ASF / WMV / WMA
  if (
    buf.length >= 16 &&
    buf[0] === 0x30 &&
    buf[1] === 0x26 &&
    buf[2] === 0xb2 &&
    buf[3] === 0x75
  ) {
    return "wmv";
  }
  // MPEG-TS
  if (buf[0] === 0x47 && buf.length > 188 && buf[188] === 0x47) return "ts";
  return null;
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
  "jfif",
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
  "geojson",
  "ini",
  "json",
  "jsonl",
  "ndjson",
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
  "ndjson",
  "geojson",
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
  "sbv",
  "lrc",
]);

/** Calendar / playlist (text-only). */
const utilityFormats = new Set(["ics", "m3u", "m3u8"]);
const utilityTextTargets = new Set([
  "ics",
  "m3u",
  "m3u8",
  "json",
  "csv",
  "tsv",
  "txt",
  "md",
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
  "apk",
  "jar",
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
  "log",
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

/** HEIF/AVIF rejects very large pixel areas at encode time. */
const HEIF_MAX_EDGE = 8192;

function isHeifSizeError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return /too large for the HEIF|exceeds maximum|maximum image size/i.test(
    message,
  );
}

/** Document outputs the converter actually produces (must match formats.ts docOutputSupported). */
export const docOutputFormats = new Set([
  "doc",
  "txt",
  "log",
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

export const audioFormats = new Set([
  "mp3",
  "wav",
  "ogg",
  "aac",
  "flac",
  "m4a",
  "wma",
  "opus",
  "aiff",
  "aif",
  "caf",
  "ac3",
  "amr",
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
  "m2ts",
  "mts",
  "vob",
  "asf",
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

const subFormats = new Set([
  "ass",
  "lrc",
  "mpl",
  "sbv",
  "srt",
  "ssa",
  "sub",
  "vtt",
]);

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
  "apk",
  "jar",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/**
 * Helvetica is a PDF base-14 font: zero embedding, so a text→PDF stays a few
 * KB instead of ~570 KB. The 1 MB Unicode font is only embedded when the text
 * actually contains glyphs Helvetica cannot draw.
 */
const ASCII_ONLY = /^[\t\n\r\x20-\x7E]*$/;

async function pickPdfFont(
  pdfDoc: PDFDocument,
  text: string,
): Promise<PDFFont> {
  if (ASCII_ONLY.test(text)) {
    return pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  pdfDoc.registerFontkit(fontkit);
  const { loadPdfUnicodeFontBytes } = await import("@/lib/pdf-utils");
  return pdfDoc.embedFont(await loadPdfUnicodeFontBytes());
}

export async function textToPdf(text: string, _title: string = "Document"): Promise<Buffer> {
  const sanitizedText = (text || "[No Content]")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .slice(0, 100000);

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pickPdfFont(pdfDoc, sanitizedText);
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

/**
 * Microsoft Word can open “Word HTML” saved as .doc without LibreOffice.
 * Used when soffice is not installed (e.g. typical Heroku dyno).
 */
function htmlAsMicrosoftWordDoc(htmlOrBody: string, title = "Document"): Buffer {
  let body = htmlOrBody;
  const fullDoc = /<html[\s>]/i.test(htmlOrBody);
  if (fullDoc) {
    const bodyMatch = htmlOrBody.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) body = bodyMatch[1];
  }
  // Strip scripts; keep markup Word understands
  body = body.replace(/<script[\s\S]*?<\/script>/gi, "");

  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const wordDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Convertek">
<title>${safeTitle}</title>
<!--[if gte mso 9]><xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml><![endif]-->
<style>
<!--
 /* Font Definitions */
 @page Section1 { size: 595.3pt 841.9pt; margin: 72.0pt; }
 div.Section1 { page: Section1; }
 body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
 h1 { font-size: 20pt; }
 h2 { font-size: 16pt; }
 h3 { font-size: 14pt; }
 pre, code { font-family: Consolas, 'Courier New', monospace; }
 table { border-collapse: collapse; }
 td, th { border: 1px solid #999; padding: 4pt 6pt; }
-->
</style>
</head>
<body lang="EN-US">
<div class="Section1">
${body}
</div>
</body>
</html>`;

  // UTF-8 BOM helps Word detect encoding for non-ASCII content
  return Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(wordDoc, "utf-8"),
  ]);
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
  const normalized = data.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) out[key] = value.toISOString();
      else if (typeof value === "number" && !Number.isFinite(value)) out[key] = null;
      else if (value != null && typeof value === "object") out[key] = JSON.stringify(value);
      else out[key] = value;
    }
    return out;
  });
  return csvStringify(normalized, { header: true });
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

export function parseResilientJson(raw: string): Record<string, unknown>[] {
  const text = raw.trim();
  if (!text) return [];

  // 1. Direct standard parse
  try {
    const val = JSON.parse(text);
    return Array.isArray(val) ? (val as Record<string, unknown>[]) : [val as Record<string, unknown>];
  } catch (_) {
    // Continue to recovery strategies
  }

  // 2. Extract embedded JSON array [ ... ]
  const firstArr = text.indexOf("[");
  const lastArr = text.lastIndexOf("]");
  if (firstArr !== -1 && lastArr > firstArr) {
    try {
      const val = JSON.parse(text.slice(firstArr, lastArr + 1));
      if (Array.isArray(val)) return val as Record<string, unknown>[];
    } catch (_) {}
  }

  // 3. Extract embedded JSON object { ... }
  const firstObj = text.indexOf("{");
  const lastObj = text.lastIndexOf("}");
  if (firstObj !== -1 && lastObj > firstObj) {
    try {
      const val = JSON.parse(text.slice(firstObj, lastObj + 1));
      return Array.isArray(val) ? (val as Record<string, unknown>[]) : [val as Record<string, unknown>];
    } catch (_) {}
  }

  // 4. Line-by-line JSON (JSONL / NDJSON)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const jsonlRecords: Record<string, unknown>[] = [];
  for (const line of lines) {
    try {
      const parsedLine = JSON.parse(line);
      if (typeof parsedLine === "object" && parsedLine !== null) {
        jsonlRecords.push(parsedLine as Record<string, unknown>);
      }
    } catch (_) {}
  }
  if (jsonlRecords.length > 0) {
    return jsonlRecords;
  }

  // 5. Relaxed syntax repair (leading dot numbers, unquoted keys, single quotes, trailing commas)
  try {
    const sanitized = text
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "") // strip comments
      .replace(/:\s*\.([0-9]+)/g, ": 0.$1") // replace .4 with 0.4
      .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":') // quote unquoted keys
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"') // single to double quotes
      .replace(/,\s*([}\]])/g, "$1"); // trailing commas
    const parsed = JSON.parse(sanitized);
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [parsed as Record<string, unknown>];
  } catch (_) {}

  // 6. Graceful text fallback for non-JSON content uploaded with .json extension
  if (lines.length > 1) {
    return lines.map((line, idx) => ({ row: idx + 1, content: line }));
  }
  return [{ content: text }];
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

function asSubtitleCues(entries: SubtitleEntry[]): SubtitleCue[] {
  return entries.map((e) => ({
    index: e.index,
    start: e.start,
    end: e.end,
    text: e.text,
  }));
}

function fromSubtitleCues(entries: SubtitleCue[]): SubtitleEntry[] {
  return entries.map((e) => ({
    index: e.index,
    start: e.start,
    end: e.end,
    text: e.text,
  }));
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
    outputExt.toLowerCase() === "jpeg" || outputExt.toLowerCase() === "jfif"
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

  if (width && height) {
    pipeline = pipeline.resize(width, height, {
      fit: "cover",
      position: "centre",
    });
  } else if (width) pipeline = pipeline.resize(width, null, { fit: "inside" });
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
        try {
          return await pipeline.avif({ quality }).toBuffer();
        } catch (e) {
          // HEIF caps total pixel area, so very large photos fail at encode
          // time with "Processed image is too large for the HEIF format".
          // Shrinking to a size HEIF accepts is far better than failing.
          if (!isHeifSizeError(e)) throw e;
          return pipeline
            .clone()
            .resize(HEIF_MAX_EDGE, HEIF_MAX_EDGE, { fit: "inside" })
            .avif({ quality })
            .toBuffer();
        }
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
    records = parseResilientJson(text);
  } else if (src === "geojson") {
    records = parseGeoJson(text);
  } else if (src === "jsonl" || src === "ndjson") {
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
    case "geojson":
      return Buffer.from(toGeoJson(records), "utf-8");
    case "jsonl":
    case "ndjson":
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
    // Prefer true binary DOC via LibreOffice when available.
    try {
      const docxBuffer = await convertDocument(input, inputExt, "docx");
      const viaLibreOffice = await convertViaLibreOffice(
        docxBuffer,
        "docx",
        "doc",
        "MS Word 97",
      );
      if (viaLibreOffice) return viaLibreOffice;
    } catch (err) {
      console.warn(
        "[convertDocument] LibreOffice/DOCX path for .doc failed, using Word-HTML fallback:",
        err instanceof Error ? err.message : err,
      );
    }

    // Fallback without soffice: Word-compatible HTML saved as .doc (opens in Word / LibreOffice / Google Docs).
    try {
      const htmlBuffer = await convertDocument(input, inputExt, "html");
      return htmlAsMicrosoftWordDoc(htmlBuffer.toString("utf-8"), "Document");
    } catch (err) {
      console.error("[convertDocument] Word-HTML .doc fallback failed:", err);
      throw new Error(libreOfficeUnavailableMessage());
    }
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
    case "log":
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
      // One text column per line (documents → spreadsheet-friendly plain export)
      const lines = plainText
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);
      if (dest === "tsv") {
        const header = "content";
        const body = lines.map((l) =>
          l.replace(/\t/g, " ").replace(/\r?\n/g, " "),
        );
        return Buffer.from([header, ...body].join("\n") + "\n", "utf-8");
      }
      const header = `"content"`;
      const body = lines.map((l) => `"${l.replace(/"/g, '""')}"`);
      return Buffer.from([header, ...body].join("\n") + "\n", "utf-8");
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
    case "sbv":
      entries = fromSubtitleCues(parseSbv(text));
      break;
    case "lrc":
      entries = fromSubtitleCues(parseLrc(text));
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
    case "sbv":
      return Buffer.from(toSbv(asSubtitleCues(entries)), "utf-8");
    case "lrc":
      return Buffer.from(toLrc(asSubtitleCues(entries)), "utf-8");
    default:
      throw new Error(
        `Subtitle conversion from ${src.toUpperCase()} to ${dest.toUpperCase()} is not implemented`,
      );
  }
}

async function convertUtilityFormat(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();
  const text = input.toString("utf-8");

  let records: Record<string, unknown>[] = [];
  if (src === "ics") {
    records = parseIcs(text);
  } else if (src === "m3u" || src === "m3u8") {
    records = parseM3u(text);
  } else if (src === "json") {
    records = parseResilientJson(text);
  } else if (src === "csv") {
    records = parseCsv(text, ",");
  } else if (src === "tsv") {
    records = parseCsv(text, "\t");
  } else if (src === "txt" || src === "md") {
    records = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => ({ content: line, url: line, title: line }));
  } else {
    throw new Error(
      `Cannot read .${src.toUpperCase()} for calendar/playlist conversion`,
    );
  }

  if (dest === "ics") {
    return Buffer.from(toIcs(records), "utf-8");
  }
  if (dest === "m3u" || dest === "m3u8") {
    return Buffer.from(toM3u(records), "utf-8");
  }
  if (dest === "json") {
    return Buffer.from(JSON.stringify(records, null, 2), "utf-8");
  }
  if (dest === "csv") {
    return Buffer.from(toCsv(records), "utf-8");
  }
  if (dest === "tsv") {
    return Buffer.from(toTsv(records), "utf-8");
  }
  if (dest === "txt" || dest === "md") {
    const lines = records.map((r) =>
      String(r.summary ?? r.title ?? r.url ?? r.content ?? JSON.stringify(r)),
    );
    return Buffer.from(lines.join("\n") + "\n", "utf-8");
  }
  throw new Error(
    `Utility conversion to .${dest.toUpperCase()} is not supported`,
  );
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
  }

  // AZW3 / MOBI: pure-JS text extract when Calibre is not installed.
  if (src === "azw3" || src === "azw" || src === "mobi") {
    try {
      const kindleText = await extractKindleEbookText(input, src);
      return convertDocument(Buffer.from(kindleText, "utf-8"), "md", dest);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Could not convert ${src.toUpperCase()} to ${dest.toUpperCase()}: ${detail}. ${calibreUnavailableMessage()}`,
      );
    }
  }

  if (["lrf", "pdb", "snb"].includes(src)) {
    throw new Error(calibreUnavailableMessage());
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

  // Reject obvious non-archives before extract (small corrupt stubs etc.)
  if (src === "rar" && input.length >= 4) {
    const isRar =
      input[0] === 0x52 &&
      input[1] === 0x61 &&
      input[2] === 0x72 &&
      input[3] === 0x21;
    if (!isRar) {
      throw new Error(
        "Invalid archive: file does not look like a real RAR (wrong magic header). Re-download or re-export the RAR and try again.",
      );
    }
  }
  if (
    (src === "zip" || src === "apk" || src === "jar" || src === "cbz") &&
    input.length >= 2
  ) {
    if (!(input[0] === 0x50 && input[1] === 0x4b)) {
      throw new Error(
        `Invalid archive: file does not look like a real ${src.toUpperCase()} (ZIP container). Re-select the file and try again.`,
      );
    }
  }

  let files: ArchiveEntry[] = [];
  try {
    files = await extractArchiveEntries(input, src);
  } catch (err) {
    throw new Error(
      `Failed to extract ${src.toUpperCase()} archive: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  // Do not silently re-wrap the raw binary as a single entry for extract fails
  // on known containers — that produces “successful” but useless archives.
  if (files.length === 0) {
    if (src === "rar" || src === "7z" || src === "zip") {
      throw new Error(
        `Empty archive or extract produced no files from .${src.toUpperCase()}. The archive may be password-protected, corrupt, or incomplete.`,
      );
    }
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
    if (rarBuffer && rarBuffer.length > 0) return rarBuffer;
    // RAR is proprietary — cannot legally create RAR without WinRAR/rar CLI.
    // Offer a clear path: repack as ZIP is a better UX than opaque failure only
    // when user specifically asked RAR we keep error but mention alternatives.
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
  if (dest === "zip" || dest === "cbz" || dest === "apk" || dest === "jar") {
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
function audioBitrateFromQuality(quality: number): string {
  if (quality >= 90) return "320k";
  if (quality >= 70) return "192k";
  if (quality >= 50) return "128k";
  return "64k";
}

function audioVbrQuality(quality: number): string {
  if (quality >= 90) return "6";
  if (quality >= 70) return "5";
  if (quality >= 50) return "4";
  return "3";
}

/**
 * Cover-art MP3s / multi-stream files: always pin first audio stream and drop
 * video/subtitles so the muxer never ends with "output has no stream" (exit 234).
 */
function pinAudioStream(command: Ffmpeg.FfmpegCommand): Ffmpeg.FfmpegCommand {
  return command.outputOptions(["-map", "0:a:0?", "-vn", "-sn", "-dn"]);
}

type AudioEncodeStrategy = {
  label: string;
  configure: (command: Ffmpeg.FfmpegCommand) => Ffmpeg.FfmpegCommand;
};

/**
 * Ordered encode paths per container. First success wins.
 * Minimal/static ffmpeg builds often break on libvorbis+bitrate alone — Opus-in-Ogg
 * and vorbis -q:a are more reliable.
 */
function getAudioEncodeStrategies(
  outputExt: string,
  quality: number,
): AudioEncodeStrategy[] {
  const bitrate = audioBitrateFromQuality(quality);
  const q = audioVbrQuality(quality);
  const dest = outputExt.toLowerCase();
  const withPin = (
    label: string,
    apply: (c: Ffmpeg.FfmpegCommand) => Ffmpeg.FfmpegCommand,
  ): AudioEncodeStrategy => ({
    label,
    configure: (command) => apply(pinAudioStream(command)),
  });

  if (dest === "ogg") {
    return [
      withPin("ogg/libopus", (c) =>
        c
          .audioCodec("libopus")
          .audioFrequency(48000)
          .audioBitrate(bitrate)
          .outputOptions(["-application", "audio", "-vbr", "on"]),
      ),
      withPin("ogg/libvorbis-q", (c) =>
        c.audioCodec("libvorbis").outputOptions(["-q:a", q]),
      ),
      withPin("ogg/libvorbis-b", (c) =>
        c.audioCodec("libvorbis").audioBitrate(bitrate),
      ),
      withPin("ogg/vorbis-experimental", (c) =>
        c
          .audioCodec("vorbis")
          .outputOptions(["-strict", "-2", "-q:a", q]),
      ),
    ];
  }
  if (dest === "opus") {
    return [
      withPin("opus/libopus", (c) =>
        c
          .audioCodec("libopus")
          .audioFrequency(48000)
          .audioBitrate(bitrate)
          .format("opus")
          .outputOptions(["-application", "audio", "-vbr", "on"]),
      ),
      withPin("opus/ogg-libopus", (c) =>
        c
          .audioCodec("libopus")
          .audioFrequency(48000)
          .audioBitrate(bitrate)
          .format("ogg"),
      ),
    ];
  }
  if (dest === "mp3") {
    return [
      withPin("mp3/libmp3lame", (c) =>
        c.audioCodec("libmp3lame").audioBitrate(bitrate),
      ),
      withPin("mp3/mp3", (c) => c.audioCodec("mp3").audioBitrate(bitrate)),
    ];
  }
  if (dest === "wav") {
    return [
      withPin("wav/pcm_s16le", (c) =>
        c.audioCodec("pcm_s16le").audioFrequency(44100),
      ),
      withPin("wav/pcm_s24le", (c) => c.audioCodec("pcm_s24le")),
    ];
  }
  if (dest === "flac") {
    return [withPin("flac", (c) => c.audioCodec("flac"))];
  }
  if (dest === "m4a") {
    return [
      withPin("m4a/aac-mp4", (c) =>
        c
          .audioCodec("aac")
          .audioBitrate(bitrate)
          .format("mp4")
          .outputOptions(["-movflags", "+faststart"]),
      ),
      withPin("m4a/aac-ipod", (c) =>
        c.audioCodec("aac").audioBitrate(bitrate).format("ipod"),
      ),
    ];
  }
  if (dest === "aac") {
    return [
      withPin("aac/adts", (c) =>
        c.audioCodec("aac").audioBitrate(bitrate).format("adts"),
      ),
      withPin("aac/mp4", (c) =>
        c.audioCodec("aac").audioBitrate(bitrate).format("mp4"),
      ),
    ];
  }
  if (dest === "wma") {
    return [
      withPin("wma/wmav2", (c) =>
        c.audioCodec("wmav2").audioBitrate(bitrate).format("asf"),
      ),
    ];
  }
  if (dest === "aiff" || dest === "aif") {
    return [
      withPin("aiff/pcm", (c) =>
        c.audioCodec("pcm_s16be").audioFrequency(44100).format("aiff"),
      ),
    ];
  }
  if (dest === "caf") {
    return [
      withPin("caf/aac", (c) =>
        c.audioCodec("aac").audioBitrate(bitrate).format("caf"),
      ),
      withPin("caf/pcm", (c) =>
        c.audioCodec("pcm_s16le").audioFrequency(44100).format("caf"),
      ),
    ];
  }
  if (dest === "ac3") {
    return [
      withPin("ac3", (c) =>
        c.audioCodec("ac3").audioBitrate(bitrate).format("ac3"),
      ),
    ];
  }
  if (dest === "amr") {
    return [
      withPin("amr/libopencore_amrnb", (c) =>
        c
          .audioCodec("libopencore_amrnb")
          .audioFrequency(8000)
          .audioChannels(1)
          .format("amr"),
      ),
    ];
  }
  return [
    withPin("audio/default", (c) => c.audioBitrate(bitrate)),
  ];
}

/** @deprecated use getAudioEncodeStrategies — kept for video mux paths */
function applyAudioCodec(
  command: Ffmpeg.FfmpegCommand,
  outputExt: string,
  quality: number = 85,
): Ffmpeg.FfmpegCommand {
  const strategies = getAudioEncodeStrategies(outputExt, quality);
  return strategies[0]!.configure(command);
}

function isRecoverableAudioEncodeError(err: Error): boolean {
  const m = err.message.toLowerCase();
  // Hard failures: missing binary, empty input, unreadable file
  if (
    /not found|not runnable|empty media|not a media file|could not read this|temp media write failed|timed out/i.test(
      m,
    )
  ) {
    return false;
  }
  return (
    /exited with code|unknown encoder|encoder|invalid argument|empty output|could not write header|error initializing|conversion failed|does not contain any stream|error while opening|error opening output|size=\s*0/i.test(
      m,
    ) || /ffmpeg/i.test(m)
  );
}

function humanizeAudioEncodeFailure(
  err: Error | null,
  dest: string,
): Error {
  const scrubbed = err ? scrubFfmpegErrorMessage(err.message) : "";
  return new Error(
    `Audio conversion to .${dest.toUpperCase()} failed${
      scrubbed ? ` (${scrubbed})` : ""
    }. Try again, or convert to WAV/MP3. If it keeps failing, the file may be incomplete or damaged.`,
  );
}

function videoCrfFromQuality(quality: number): number {
  if (quality >= 90) return 20;
  if (quality >= 75) return 23;
  if (quality >= 55) return 28;
  return 32;
}

function applyVideoCodec(
  command: Ffmpeg.FfmpegCommand,
  outputExt: string,
  quality: number = 85,
  inputBytes: number = 0,
): Ffmpeg.FfmpegCommand {
  const dest = outputExt.toLowerCase();
  let crf = videoCrfFromQuality(quality);
  const large = inputBytes >= 12 * 1024 * 1024;
  // Prioritize finishing: ultrafast + capped height for almost all re-encodes.
  const preset = "ultrafast";
  if (large) {
    crf = Math.max(crf, 30);
  }

  // Cap resolution (biggest encode-time win on Heroku dynos)
  let scale: string | null = null;
  if (large || quality < 60) {
    scale = "scale='min(720,iw)':-2";
  } else if (quality < 80) {
    scale = "scale='min(1280,iw)':-2";
  } else {
    scale = "scale='min(1280,iw)':-2";
  }

  if (dest === "webm") {
    // Prefer faster VP8 for large files (VP9 is very slow on 1× dyno)
    const opts = [
      "-b:v",
      large ? "700k" : "1M",
      "-b:a",
      "96k",
      "-deadline",
      "realtime",
      "-cpu-used",
      "8",
    ];
    let cmd = command
      .videoCodec("libvpx")
      .audioCodec("libopus")
      .outputOptions(opts);
    if (scale) cmd = cmd.outputOptions(["-vf", scale]);
    return cmd;
  }
  if (dest === "ogv") {
    let cmd = command.videoCodec("libtheora").audioCodec("libvorbis");
    if (scale) cmd = cmd.outputOptions(["-vf", scale]);
    return cmd;
  }
  if (dest === "wmv") {
    let cmd = command.videoCodec("wmv2").audioCodec("wmav2");
    if (scale) cmd = cmd.outputOptions(["-vf", scale]);
    return cmd;
  }
  if (dest === "asf") {
    let cmd = command
      .videoCodec("wmv2")
      .audioCodec("wmav2")
      .format("asf");
    if (scale) cmd = cmd.outputOptions(["-vf", scale]);
    return cmd;
  }
  if (dest === "ts" || dest === "m2ts" || dest === "mts") {
    const tsOpts = [
      "-f",
      "mpegts",
      "-preset",
      preset,
      "-crf",
      String(crf),
      "-pix_fmt",
      "yuv420p",
    ];
    if (scale) tsOpts.unshift("-vf", scale);
    return command
      .videoCodec("libx264")
      .audioCodec("aac")
      .audioBitrate(large ? "96k" : "128k")
      .outputOptions(tsOpts);
  }
  if (dest === "vob") {
    const vobOpts = [
      "-f",
      "dvd",
      "-target",
      "ntsc-dvd",
    ];
    if (scale) vobOpts.unshift("-vf", scale);
    return command
      .videoCodec("mpeg2video")
      .audioCodec("ac3")
      .outputOptions(vobOpts);
  }
  const outOpts = [
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-threads",
    "0",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    // Cap fps slightly for very long clips saves CPU
    "-r",
    large ? "24" : "30",
  ];
  if (scale) {
    outOpts.unshift("-vf", scale);
  }
  return command
    .videoCodec("libx264")
    .audioCodec("aac")
    .audioBitrate(large ? "96k" : "128k")
    .outputOptions(outOpts);
}

async function convertAudio(
  input: Buffer,
  inputExt: string,
  outputExt: string,
  quality: number = 85,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();
  if (!audioFormats.has(dest)) {
    throw new Error(
      `Audio output .${outputExt.toUpperCase()} is not supported. Supported: ${[...audioFormats].sort().join(", ")}`,
    );
  }

  const strategies = getAudioEncodeStrategies(dest, quality);
  let lastError: Error | null = null;
  for (const strategy of strategies) {
    try {
      return await convertWithFfmpegFiles(
        input,
        src,
        dest,
        strategy.configure,
        audioUnavailableMessage(),
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[ffmpeg] audio strategy failed (${strategy.label}):`,
        lastError.message,
      );
      if (!isRecoverableAudioEncodeError(lastError)) {
        throw lastError;
      }
    }
  }
  throw humanizeAudioEncodeFailure(lastError, dest);
}

async function convertVideo(
  input: Buffer,
  inputExt: string,
  outputExt: string,
  quality: number = 85,
): Promise<Buffer> {
  const src = inputExt.toLowerCase();
  const dest = outputExt.toLowerCase();

  // Video → audio extract (same robust multi-strategy path as pure audio)
  if (audioFormats.has(dest)) {
    const strategies = getAudioEncodeStrategies(dest, quality);
    let lastError: Error | null = null;
    for (const strategy of strategies) {
      try {
        return await convertWithFfmpegFiles(
          input,
          src,
          dest,
          strategy.configure,
          videoUnavailableMessage(),
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(
          `[ffmpeg] video→audio strategy failed (${strategy.label}):`,
          lastError.message,
        );
        if (!isRecoverableAudioEncodeError(lastError)) {
          throw lastError;
        }
      }
    }
    throw humanizeAudioEncodeFailure(lastError, dest);
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
    (command) => applyVideoCodec(command, dest, quality, input.length),
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
  const { text, png, svg } = await extractDrawioContent(input);

  if ((dest === "png" || dest === "jpg" || dest === "jpeg") && png) {
    return convertImage(png, "png", dest === "jpeg" ? "jpg" : dest, quality);
  }

  if (dest === "svg") {
    if (svg) return Buffer.from(svg, "utf-8");
    const labels = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const lines = labels
      .map(
        (l, i) =>
          `<text x="20" y="${24 + i * 22}" font-size="14">${l.replace(/</g, "&lt;")}</text>`,
      )
      .join("");
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${Math.max(200, labels.length * 24)}">${lines}</svg>`,
      "utf-8",
    );
  }

  if (dest === "png" || dest === "jpg" || dest === "jpeg") {
    if (!svg) {
      throw new Error(
        "Could not render this DrawIO diagram to an image. Try SVG, PDF, HTML, or TXT.",
      );
    }
    const raster = await sharp(Buffer.from(svg, "utf-8"), {
      density: 150,
      failOn: "none",
    });
    if (dest === "png") return raster.png().toBuffer();
    return raster.jpeg({ quality }).toBuffer();
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
    return convertVideo(input, src, dest, quality);
  }

  if (audioFormats.has(src) && audioFormats.has(dest)) {
    return convertAudio(input, src, dest, quality);
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

  if (docFormats.has(src) && docOutputFormats.has(dest)) {
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

  if (subFormats.has(src) && subtitleOutputFormats.has(dest)) {
    return convertSubtitle(input, src, dest);
  }

  if (
    (utilityFormats.has(src) || utilityFormats.has(dest)) &&
    utilityTextTargets.has(src) &&
    utilityTextTargets.has(dest)
  ) {
    return convertUtilityFormat(input, src, dest);
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
