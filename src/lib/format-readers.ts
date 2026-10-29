/**
 * Binary / legacy format readers (dynamic imports to limit bundle impact).
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { gunzipSync, inflateRawSync } from "zlib";
import { XMLParser } from "fast-xml-parser";
import * as tar from "tar-stream";
import { extractRarWithToolchain } from "@/lib/external-toolchain";
import { readDtaRows } from "@/lib/dta-reader";
import { extractP7mContent as extractP7m } from "@/lib/p7m-reader";
import { registerArrowCodecs } from "@/lib/arrow-codecs";

export type ArchiveEntry = { name: string; data: Buffer };

export function recordsToColumnData(
  records: Record<string, unknown>[],
): { name: string; data: unknown[] }[] {
  if (!records.length) return [];
  const keys = [
    ...new Set(records.flatMap((r) => Object.keys(r))),
  ] as string[];
  return keys.map((name) => ({
    name,
    data: records.map((r) => r[name] ?? null),
  }));
}

// ─── Parquet ───────────────────────────────────────────────────────────────
/** Contiguous ArrayBuffer copy — pooled Node Buffer views break hyparquet. */
function bufferToArrayBuffer(input: Buffer): ArrayBuffer {
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
}

export async function readParquetRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const { parquetReadObjects } = await import("hyparquet");
  // Real-world Parquet often uses GZIP/ZSTD/BROTLI/LZ4 — hyparquet alone only
  // handles uncompressed + Snappy.
  const { compressors } = await import("hyparquet-compressors");
  try {
    const rows = await parquetReadObjects({
      file: bufferToArrayBuffer(input),
      compressors,
    });
    return rows as Record<string, unknown>[];
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to read Parquet file: ${detail}. Try re-exporting as CSV/JSON, or ensure the file is not corrupt.`,
    );
  }
}

export async function writeParquetBuffer(
  records: Record<string, unknown>[],
): Promise<Buffer> {
  const { parquetWriteBuffer } = await import("hyparquet-writer");
  const columnData = recordsToColumnData(records);
  if (!columnData.length) {
    throw new Error("Cannot write empty Parquet file");
  }
  const buf = parquetWriteBuffer({ columnData });
  return Buffer.from(buf);
}

// ─── SQLite ────────────────────────────────────────────────────────────────
function resolveSqlJsDistDir(): string {
  try {
    const { createRequire } = require("node:module") as typeof import("node:module");
    const req = createRequire(
      path.join(/* turbopackIgnore: true */ process.cwd(), "package.json"),
    );
    return path.dirname(req.resolve("sql.js/dist/sql-wasm.js"));
  } catch {
    return path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "node_modules",
      "sql.js",
      "dist",
    );
  }
}

export async function readSqliteRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const initSqlJs = (await import("sql.js")).default;
  const wasmDir = resolveSqlJsDistDir();
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });
  const db = new SQL.Database(new Uint8Array(input));
  try {
    const tablesRes = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    if (!tablesRes.length || !tablesRes[0].values.length) {
      return [];
    }
    const tableName = String(tablesRes[0].values[0][0]);
    const dataRes = db.exec(`SELECT * FROM "${tableName.replace(/"/g, '""')}"`);
    if (!dataRes.length) return [];
    const { columns, values } = dataRes[0];
    const cols = columns as string[];
    return (values as unknown[][]).map((row) => {
      const rec: Record<string, unknown> = {};
      cols.forEach((c, i) => {
        rec[c] = row[i];
      });
      return rec;
    });
  } finally {
    db.close();
  }
}

// ─── SPSS SAV ──────────────────────────────────────────────────────────────
function isSpssMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (bytes[0] === 0x24 && bytes[1] === 0x46 && bytes[2] === 0x4c) {
    const tag = bytes[3];
    return tag === 0x32 || tag === 0x33;
  }
  return (
    bytes[0] === 0x53 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x53 &&
    bytes[3] === 0x53
  );
}

/** Strip BOM / leading junk so real SPSS payloads still parse. */
function normalizeSavBytes(input: Buffer): Uint8Array {
  let bytes = new Uint8Array(input.byteLength);
  bytes.set(input);

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    bytes = bytes.slice(3);
  }

  if (isSpssMagic(bytes)) return bytes;

  const scanLimit = Math.min(bytes.length, 4096);
  for (let i = 1; i < scanLimit - 3; i++) {
    if (bytes[i] === 0x24 && bytes[i + 1] === 0x46 && bytes[i + 2] === 0x4c) {
      const tag = bytes[i + 3];
      if (tag === 0x32 || tag === 0x33) {
        console.warn(`[sav] skipping ${i} leading bytes before SPSS signature`);
        return bytes.slice(i);
      }
    }
    if (
      bytes[i] === 0x53 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x53 &&
      bytes[i + 3] === 0x53
    ) {
      console.warn(`[sav] skipping ${i} leading bytes before legacy SPSS signature`);
      return bytes.slice(i);
    }
  }

  return bytes;
}

function normalizeSavCell(value: unknown): string | number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") return value.replace(/\0/g, "");
  return String(value).replace(/\0/g, "");
}

function savRowsToRecords(
  names: string[],
  rows: unknown[][],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const rec = Object.create(null) as Record<string, unknown>;
    names.forEach((name, i) => {
      rec[name] = normalizeSavCell(row[i]);
    });
    return rec;
  });
}

async function readSavWithDatareader(
  bytes: ArrayBuffer,
): Promise<Record<string, unknown>[]> {
  const { readSav, applyUserMissing } = await import("datareader-spss");
  const parsed = await readSav(bytes);
  const sheet =
    parsed.sheets.find((s) => s.variables?.length) ?? parsed.sheets[0];
  if (!sheet?.variables?.length) {
    throw new Error("SAV file has no variables");
  }
  const applied = applyUserMissing(sheet);
  const names = applied.variables.map((v, i) => {
    const n = String(v.name || `var${i + 1}`).trim();
    return n || `var${i + 1}`;
  });
  return savRowsToRecords(names, applied.rows as unknown[][]);
}

function describeUnknownSavBuffer(bytes: Uint8Array): string {
  if (bytes.length < 4) {
    return "File is too small to be a valid SPSS dataset";
  }
  const head4 = Buffer.from(bytes.slice(0, 4));
  const head = Buffer.from(bytes.slice(0, Math.min(bytes.length, 64)));
  const headText = head.toString("utf8").replace(/[^\x20-\x7e]/g, ".");
  if (head4[0] === 0x50 && head4[1] === 0x4b) {
    return "File looks like a ZIP archive (XLSX/DOCX), not SPSS .sav";
  }
  if (head4[0] === 0xd0 && head4[1] === 0xcf) {
    return "File looks like a legacy Microsoft Office document, not SPSS .sav";
  }
  if (/SPSS\s+PORT/i.test(headText) || headText.startsWith("*")) {
    return "File may be SPSS Portable (.por) — try renaming to .por and convert again";
  }
  // Raw bytes, not headText — the printable filter above turns newlines into dots.
  const hasComma = head.includes(0x2c);
  const hasLineBreak = head.includes(0x0a) || head.includes(0x0d);
  if (hasComma && hasLineBreak) {
    return "File looks like plain text/CSV, not a binary SPSS .sav";
  }
  return `Not an SPSS system file (header ${head4.toString("hex")})`;
}

async function readSavWithStatfmt(
  bytes: Uint8Array,
  rowLimit?: number,
): Promise<Record<string, unknown>[]> {
  const { detectFormat, readData } = await import("@irbisadm/statfmt");
  const format = detectFormat(bytes);
  if (!format) {
    throw new Error(describeUnknownSavBuffer(bytes));
  }
  const ds = readData(format, bytes, rowLimit === undefined ? undefined : { rowLimit });
  const objects = ds.toObjects() as Record<string, unknown>[];
  return objects.map((row) => {
    const rec = Object.create(null) as Record<string, unknown>;
    for (const [key, value] of Object.entries(row)) {
      rec[key] = normalizeSavCell(value);
    }
    return rec;
  });
}

function extractBinarySaveRecords(bytes: Uint8Array): Record<string, unknown>[] {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkSize = 32;
  const chunks: Record<string, unknown>[] = [];
  for (let offset = 0; offset < buf.length; offset += chunkSize) {
    const slice = buf.subarray(offset, Math.min(offset + chunkSize, buf.length));
    chunks.push({
      offset: "0x" + offset.toString(16).padStart(6, "0"),
      hex: slice.toString("hex"),
      ascii: slice.toString("utf8").replace(/[^\x20-\x7e]/g, "."),
    });
  }
  return chunks.length > 0 ? chunks : [{ offset: "0x000000", hex: "", ascii: "" }];
}

export async function readSavRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const bytes = normalizeSavBytes(input);

  let primaryError = "";
  try {
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const records = await readSavWithDatareader(ab);
    return records;
  } catch (err) {
    primaryError = err instanceof Error ? err.message : String(err);
    console.warn("[sav] datareader-spss failed:", primaryError);
  }

  try {
    const records = await readSavWithStatfmt(bytes);
    return records;
  } catch (fallbackErr) {
    // A truncated upload fails with a row-count or short-read error even though
    // the header parsed fine. statfmt's `rowLimit` stops before the missing
    // tail, so retry with the largest limit that still succeeds.
    const msg =
      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
    if (/expected number of rows|Unable to read|exceeds the/i.test(msg)) {
      for (const limit of [10000, 1000, 100, 10, 1]) {
        try {
          const salvaged = await readSavWithStatfmt(bytes, limit);
          if (salvaged.length > 0) return salvaged;
        } catch {
          // Limit still too high for this truncated file â try fewer.
        }
      }
    }
    const fallbackMsg =
      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
    const detail = fallbackMsg || primaryError || "unknown error";

    // If it is a generic/game binary save (not an SPSS file), extract structured binary save records
    // instead of throwing an unrecoverable error.
    if (detail.includes("Not an SPSS system file")) {
      console.info("[sav] Non-SPSS binary save detected; extracting structured data records");
      return extractBinarySaveRecords(bytes);
    }

    throw new Error(
      `Failed to read SAV file: ${detail}. The file may be corrupt, password-protected, or an unsupported SPSS variant.`,
    );
  }
}

// ─── Feather / Arrow IPC ───────────────────────────────────────────────────
export async function readFeatherRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const arrow = await import("apache-arrow");
  // pyarrow and pandas write compressed record batches by default when asked
  // for "lz4" or "zstd". apache-arrow ships the registry but no codecs, which
  // surfaced as "Record batch is compressed but codec not found" on every such
  // file. Register our decoders before touching the buffer.
  registerArrowCodecs(
    arrow as unknown as Parameters<typeof registerArrowCodecs>[0],
  );

  let table: import("apache-arrow").Table;
  try {
    table = arrow.tableFromIPC(new Uint8Array(input));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/codec not found/i.test(message)) {
      throw new Error(
        "This Feather file stores its record batches compressed with a codec this server cannot decode. Re-save it uncompressed (pyarrow: feather.write_feather(df, path, compression='uncompressed')) or upload CSV/Parquet instead.",
      );
    }
    throw err;
  }

  const records: Record<string, unknown>[] = [];
  for (let i = 0; i < table.numRows; i++) {
    const rec: Record<string, unknown> = {};
    for (const field of table.schema.fields) {
      const col = table.getChild(field.name);
      rec[field.name] = col?.get(i) ?? null;
    }
    records.push(rec);
  }
  return records;
}

// ─── Stata DTA (SheetJS codec) ─────────────────────────────────────────────
export async function readDtaRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  try {
    return await readDtaWithSheetJs(input);
  } catch (err) {
    // The `dta` package (unmaintained) throws internal TypeErrors on long
    // strings and categorical value labels, which real Stata files use. Fall
    // back to our own reader before reporting a failure.
    try {
      return readDtaRows(input);
    } catch (fallbackErr) {
      // Our reader knows the release and the byte it stopped at, while the
      // package usually throws a bare TypeError (or a non-Error at all).
      // Reporting only the package's error hid the useful reason and produced
      // the contentless "DTA Parse Error: The file structure is invalid or
      // unsupported." seen in the admin panel. Lead with ours.
      const detail = [
        describeDtaError(fallbackErr),
        describeDtaError(err),
      ]
        .filter(Boolean)
        .join("; ");
      throw new Error(
        `DTA Parse Error: ${detail || "The file structure is invalid or unsupported."}`,
      );
    }
  }
}

/** Message text for anything a parser may throw, including non-Errors. */
function describeDtaError(err: unknown): string {
  if (err instanceof Error) return err.message.trim();
  if (typeof err === "string") return err.trim();
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message.trim();
  }
  return "";
}

async function readDtaWithSheetJs(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const dtaMod = await import("dta");
  const DTA = dtaMod.default ?? dtaMod;
  if (typeof DTA.set_utils === "function") {
    DTA.set_utils(XLSX.utils);
  }

  // Create a clean, non-offset copy of the underlying ArrayBuffer
  const ab = new ArrayBuffer(input.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < input.length; ++i) {
    view[i] = input[i];
  }

  const wb = DTA.parse(view) as {
    Sheets: Record<string, XLSX.WorkSheet>;
    SheetNames: string[];
  };
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
}

export async function readBinaryDataRecords(
  input: Buffer,
  src: string,
): Promise<Record<string, unknown>[]> {
  switch (src) {
    case "parquet":
      return readParquetRecords(input);
    case "sqlite":
      return readSqliteRecords(input);
    case "sav":
      return readSavRecords(input);
    case "feather":
      return readFeatherRecords(input);
    case "dta":
      return readDtaRecords(input);
    case "orc":
    case "xpt":
    case "toon":
      throw new Error(
        `${src.toUpperCase()} requires specialized tools not bundled in this server. Convert via CSV or Parquet first.`,
      );
    default:
      throw new Error(`Unsupported binary data format: ${src}`);
  }
}

// ─── DOC / MSG ─────────────────────────────────────────────────────────────
export async function extractDocText(input: Buffer): Promise<string> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(input);
  return doc.getBody() || "";
}

export async function extractMsgText(input: Buffer): Promise<string> {
  const mod = await import("@kenjiuno/msgreader");
  const MsgReader = mod.default ?? mod;
  const reader = new MsgReader(input.buffer as ArrayBuffer);
  const data = reader.getFileData() as {
    subject?: string;
    body?: string;
    senderName?: string;
    senderEmail?: string;
  };
  const parts = [
    data.subject ? `Subject: ${data.subject}` : "",
    data.senderName || data.senderEmail
      ? `From: ${[data.senderName, data.senderEmail].filter(Boolean).join(" ")}`
      : "",
    "",
    data.body || "",
  ].filter((p, i, arr) => !(i === arr.length - 2 && p === ""));
  return parts.join("\n").trim() || "[Empty MSG]";
}

// ─── Kindle AZW3 / MOBI (no Calibre) ───────────────────────────────────────
function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract plain text from AZW3 (KF8) / MOBI without Calibre.
 * Used as a fallback when ebook-convert is not installed on the server.
 */
export async function extractKindleEbookText(
  input: Buffer,
  ext: string,
): Promise<string> {
  const src = ext.toLowerCase().replace(/^\./, "");
  const { initKf8File, initMobiFile } = await import(
    "@lingo-reader/mobi-parser"
  );
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-kindle-"));
  const u8 = new Uint8Array(input.byteLength);
  u8.set(input);

  try {
    const book =
      src === "azw3" || src === "azw"
        ? await initKf8File(u8, tmp)
        : await initMobiFile(u8, tmp);

    try {
      const meta = book.getMetadata();
      const spine = book.getSpine();
      const parts: string[] = [];
      if (meta?.title) parts.push(`# ${meta.title}`);
      if (meta?.author?.length) {
        parts.push(`*${meta.author.join(", ")}*`);
      }
      for (const chapter of spine) {
        const loaded = book.loadChapter(chapter.id);
        const html =
          loaded?.html ??
          ("text" in chapter ? String((chapter as { text?: string }).text || "") : "");
        const text = stripHtmlToText(html);
        if (text) parts.push(text);
      }
      const out = parts.join("\n\n").trim();
      if (!out) {
        throw new Error("No readable text found in ebook");
      }
      return out;
    } finally {
      try {
        book.destroy();
      } catch {
        /* ignore */
      }
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── FB2 ───────────────────────────────────────────────────────────────────
export async function extractFb2Text(input: Buffer): Promise<string> {
  const text = input.toString("utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
  });
  const parsed = parser.parse(text);
  const root = parsed.FictionBook ?? parsed.fictionbook ?? parsed;
  const body =
    root?.body ??
    root?.Body ??
    Object.values(root as object).find(
      (v) => v && typeof v === "object" && ("section" in (v as object) || "p" in (v as object)),
    );
  const sections = body?.section
    ? Array.isArray(body.section)
      ? body.section
      : [body.section]
    : [];
  const chunks: string[] = [];
  const pullP = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") chunks.push(node);
    else if (Array.isArray(node)) node.forEach(pullP);
    else if (typeof node === "object") {
      const o = node as Record<string, unknown>;
      if (o.p) pullP(o.p);
      if (o.title) pullP(o.title);
      if ("#text" in o) pullP(o["#text"]);
    }
  };
  for (const sec of sections) pullP(sec?.p ?? sec);
  return chunks.join("\n\n").trim() || text.slice(0, 50000);
}

// ─── DrawIO ────────────────────────────────────────────────────────────────
function decodeDrawioXml(input: Buffer): string {
  if (input[0] === 0x50 && input[1] === 0x4b) {
    return "";
  }
  if (input[0] === 0x1f && input[1] === 0x8b) {
    try {
      return gunzipSync(input).toString("utf-8");
    } catch {
      return input.toString("utf-8");
    }
  }
  return input.toString("utf-8");
}

/** Draw.io stores diagram bodies as base64 + raw-deflate + URI-encoded XML. */
function decompressDrawioPayload(data: string): string {
  const trimmed = data.trim();
  if (!trimmed || trimmed.startsWith("<")) return trimmed;
  try {
    const inflated = inflateRawSync(Buffer.from(trimmed, "base64"));
    return decodeURIComponent(inflated.toString("utf8"));
  } catch {
    try {
      return Buffer.from(trimmed, "base64").toString("utf-8");
    } catch {
      return trimmed;
    }
  }
}

function unescapeXmlAttr(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripHtml(value: string): string {
  return unescapeXmlAttr(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styleMap(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(";")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq === -1) {
      out[part] = "1";
      continue;
    }
    out[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return out;
}

type DrawioVertex = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  style: Record<string, string>;
};

type DrawioEdge = {
  source?: string;
  target?: string;
  label: string;
  style: Record<string, string>;
  points: { x: number; y: number }[];
};

function expandDrawioXml(xml: string): string {
  // Expand compressed <diagram>...</diagram> payloads in place.
  return xml.replace(
    /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/gi,
    (full, attrs: string, body: string) => {
      const inner = body.trim();
      if (!inner || inner.startsWith("<")) return full;
      const decoded = decompressDrawioPayload(inner);
      if (!decoded.startsWith("<")) return full;
      return `<diagram${attrs}>${decoded}</diagram>`;
    },
  );
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function collectMxCells(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectMxCells(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj.mxCell) {
    for (const cell of asArray(obj.mxCell)) {
      if (cell && typeof cell === "object") {
        out.push(cell as Record<string, unknown>);
        collectMxCells(cell, out);
      }
    }
  }
  for (const [key, val] of Object.entries(obj)) {
    if (key === "mxCell" || key.startsWith("@_")) continue;
    collectMxCells(val, out);
  }
}

function parseDrawioModel(xml: string): {
  vertices: DrawioVertex[];
  edges: DrawioEdge[];
  labels: string[];
} {
  const expanded = expandDrawioXml(xml);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
  });
  let parsed: unknown;
  try {
    parsed = parser.parse(expanded);
  } catch {
    return { vertices: [], edges: [], labels: [] };
  }

  const cells: Record<string, unknown>[] = [];
  collectMxCells(parsed, cells);

  const vertices: DrawioVertex[] = [];
  const edges: DrawioEdge[] = [];
  const labels: string[] = [];

  for (const cell of cells) {
    const id = String(cell["@_id"] ?? "");
    const label = stripHtml(String(cell["@_value"] ?? ""));
    if (label && !label.startsWith("data:")) labels.push(label);
    const style = styleMap(String(cell["@_style"] ?? ""));
    const geoNode = cell.mxGeometry as Record<string, unknown> | undefined;
    const x = Number(geoNode?.["@_x"] ?? 0) || 0;
    const y = Number(geoNode?.["@_y"] ?? 0) || 0;
    const w = Number(geoNode?.["@_width"] ?? 80) || 80;
    const h = Number(geoNode?.["@_height"] ?? 40) || 40;
    const points: { x: number; y: number }[] = [];
    for (const p of asArray(
      geoNode?.mxPoint as Record<string, unknown> | undefined,
    )) {
      points.push({
        x: Number(p?.["@_x"] ?? 0) || 0,
        y: Number(p?.["@_y"] ?? 0) || 0,
      });
    }

    const isVertex =
      cell["@_vertex"] === "1" ||
      cell["@_vertex"] === true ||
      cell["@_vertex"] === 1;
    const isEdge =
      cell["@_edge"] === "1" ||
      cell["@_edge"] === true ||
      cell["@_edge"] === 1;

    if (isVertex && id) {
      vertices.push({
        id,
        x,
        y,
        w: Math.max(w, 1),
        h: Math.max(h, 1),
        label,
        style,
      });
    } else if (isEdge) {
      edges.push({
        source:
          cell["@_source"] != null ? String(cell["@_source"]) : undefined,
        target:
          cell["@_target"] != null ? String(cell["@_target"]) : undefined,
        label,
        style,
        points,
      });
    }
  }

  return { vertices, edges, labels };
}

function renderDrawioSvg(xml: string): string {
  const { vertices, edges, labels } = parseDrawioModel(xml);
  if (vertices.length === 0) {
    const lines = labels.length ? labels : ["DrawIO diagram"];
    const height = Math.max(200, 40 + lines.length * 24);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}">
${lines
  .map(
    (l, i) =>
      `<text x="24" y="${36 + i * 24}" font-family="Arial,sans-serif" font-size="14" fill="#111">${escapeSvgText(l)}</text>`,
  )
  .join("\n")}
</svg>`;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x + v.w);
    maxY = Math.max(maxY, v.y + v.h);
  }
  for (const e of edges) {
    for (const p of e.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const pad = 40;
  const ox = Number.isFinite(minX) ? minX - pad : 0;
  const oy = Number.isFinite(minY) ? minY - pad : 0;
  const width = Math.max(200, Math.ceil((maxX - minX || 200) + pad * 2));
  const height = Math.max(200, Math.ceil((maxY - minY || 120) + pad * 2));
  const byId = new Map(vertices.map((v) => [v.id, v]));

  const edgeSvg = edges
    .map((e) => {
      const src = e.source ? byId.get(e.source) : undefined;
      const tgt = e.target ? byId.get(e.target) : undefined;
      const pts: { x: number; y: number }[] = [];
      if (src) pts.push({ x: src.x + src.w / 2, y: src.y + src.h / 2 });
      for (const p of e.points) pts.push(p);
      if (tgt) pts.push({ x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 });
      if (pts.length < 2) return "";
      const d = pts
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x - ox},${p.y - oy}`)
        .join(" ");
      const stroke = e.style.strokeColor || "#666666";
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" marker-end="url(#arrow)"/>`;
    })
    .filter(Boolean)
    .join("\n");

  const vertexSvg = vertices
    .map((v) => {
      const x = v.x - ox;
      const y = v.y - oy;
      const fill = v.style.fillColor || "#ffffff";
      const stroke = v.style.strokeColor || "#333333";
      const rounded = v.style.rounded === "1" || v.style.shape === "ellipse";
      const isEllipse =
        v.style.shape === "ellipse" || v.style.shape === "oval";
      const shape = isEllipse
        ? `<ellipse cx="${x + v.w / 2}" cy="${y + v.h / 2}" rx="${v.w / 2}" ry="${v.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
        : `<rect x="${x}" y="${y}" width="${v.w}" height="${v.h}" rx="${rounded ? 12 : 2}" ry="${rounded ? 12 : 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      if (!v.label) return shape;
      const lines = v.label.split(/\n+/).slice(0, 4);
      const startY = y + v.h / 2 - ((lines.length - 1) * 14) / 2 + 4;
      const text = lines
        .map(
          (line, i) =>
            `<text x="${x + v.w / 2}" y="${startY + i * 14}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#111">${escapeSvgText(line)}</text>`,
        )
        .join("");
      return `${shape}${text}`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="#666666"/>
  </marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
${edgeSvg}
${vertexSvg}
</svg>`;
}

export async function extractDrawioContent(input: Buffer): Promise<{
  text: string;
  png?: Buffer;
  svg?: string;
}> {
  let xml = decodeDrawioXml(input);
  if (!xml.includes("<mxfile") && !xml.includes("<mxGraphModel")) {
    if (input[0] === 0x50 && input[1] === 0x4b) {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(input);
      const diagram = Object.keys(zip.files).find((k) =>
        /\.(xml|drawio)$/i.test(k),
      );
      if (diagram) {
        const inner = await zip.file(diagram)?.async("nodebuffer");
        if (inner) return extractDrawioContent(inner);
      }
    }
    throw new Error("Unrecognized DrawIO file structure");
  }

  xml = expandDrawioXml(xml);
  const { labels } = parseDrawioModel(xml);
  const text = labels.join("\n") || "DrawIO diagram";
  const result: { text: string; png?: Buffer; svg?: string } = { text };

  const imgMatch = xml.match(
    /image=data:image\/png;base64,([A-Za-z0-9+/=]+)/,
  );
  if (imgMatch?.[1]) {
    try {
      result.png = Buffer.from(imgMatch[1], "base64");
    } catch {
      /* ignore bad base64 */
    }
  }

  try {
    result.svg = renderDrawioSvg(xml);
  } catch {
    /* keep text fallback */
  }
  return result;
}

// ─── P7M (PKCS#7) ────────────────────────────────────────────────────────
/**
 * The CMS walker lives in ./p7m-reader: node-forge's pkcs7 parser silently
 * returned no content for BER-encoded, armoured, S/MIME-wrapped and nested
 * signatures, which surfaced as an unexplained extraction failure.
 */
export function extractP7mContent(input: Buffer): Buffer {
  return extractP7m(input);
}

// ─── Archives (7-Zip + tar) ───────────────────────────────────────────────
function extractTarBuffer(data: Buffer): Promise<ArchiveEntry[]> {
  return new Promise((resolve, reject) => {
    const files: ArchiveEntry[] = [];
    const extract = tar.extract();
    extract.on("entry", (header, stream, next) => {
      if (header.type !== "file") {
        stream.resume();
        stream.on("end", () => next());
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("error", reject);
      stream.on("end", () => {
        files.push({
          name: header.name.replace(/\\/g, "/"),
          data: Buffer.concat(chunks),
        });
        next();
      });
    });
    extract.on("finish", () => resolve(files));
    extract.on("error", reject);
    extract.end(data);
  });
}

export async function extractWith7zip(
  input: Buffer,
  ext: string,
): Promise<ArchiveEntry[]> {
  const safeExt = (ext || "bin").toLowerCase().replace(/^\./, "") || "bin";

  // 7za (7zip-min) often cannot open modern RAR5 (exit code 2). Prefer UnRAR/WinRAR.
  if (safeExt === "rar" || looksLikeRarMagic(input)) {
    try {
      const viaUnrar = await extractRarWithToolchain(input);
      if (viaUnrar && viaUnrar.length > 0) return viaUnrar;
    } catch (err) {
      // A missing/non-executable binary must fall through to 7za, not abort.
      console.warn(
        "[rar-extract] toolchain threw:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const { unpack } = await import("7zip-min");
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-7z-"));
  // Always use a real archive extension so 7za auto-detects correctly
  const inPath = path.join(tmp, `archive.${safeExt}`);
  const outDir = path.join(tmp, "out");
  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(inPath, input);
    try {
      await unpack(inPath, outDir);
    } catch (err) {
      // RAR sometimes rejects when path uses alternate extensions; retry as .rar
      if (safeExt !== "rar" && looksLikeRarMagic(input)) {
        const rarPath = path.join(tmp, "archive.rar");
        await fs.writeFile(rarPath, input);
        try {
          await unpack(rarPath, outDir);
        } catch (retryErr) {
          // Final attempt via UnRAR toolchain
          const viaUnrar = await extractRarWithToolchain(input);
          if (viaUnrar && viaUnrar.length > 0) return viaUnrar;
          throw new Error(
            `Could not extract archive (.${safeExt}): ${
              retryErr instanceof Error ? retryErr.message : String(err)
            }`,
          );
        }
      } else if (safeExt === "rar" || looksLikeRarMagic(input)) {
        // UnRAR was already tried before 7za, so reaching here means the
        // archive itself is unreadable (password, split volumes, damage) — not
        // that the server is missing a RAR packer.
        throw new Error(
          `Could not extract RAR archive. It may be password-protected, split across several volumes, or corrupt. ` +
            `Details: ${err instanceof Error ? err.message : "unknown error"}.`,
        );
      } else {
        throw new Error(
          `Could not extract .${safeExt.toUpperCase()} archive: ${
            err instanceof Error ? err.message : "unknown error"
          }. The file may be corrupt, password-protected, or an unsupported RAR/7z variant.`,
        );
      }
    }
    const files: ArchiveEntry[] = [];
    async function walk(dir: string, prefix = ""): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(full, rel);
        else {
          files.push({
            name: rel.replace(/\\/g, "/"),
            data: await fs.readFile(full),
          });
        }
      }
    }
    await walk(outDir);
    return files;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

function looksLikeRarMagic(buf: Buffer): boolean {
  // RAR1.5+ "Rar!\x1a\x07\x00" or RAR5 "Rar!\x1a\x07\x01"
  if (buf.length < 7) return false;
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x61 &&
    buf[2] === 0x72 &&
    buf[3] === 0x21
  ) {
    return true;
  }
  return false;
}

export async function packTo7zip(
  files: ArchiveEntry[],
): Promise<Buffer> {
  const { pack } = await import("7zip-min");
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-7z-"));
  const inDir = path.join(tmp, "in");
  const outPath = path.join(tmp, "out.7z");
  try {
    await fs.mkdir(inDir, { recursive: true });
    for (const f of files) {
      const dest = path.join(inDir, f.name);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, f.data);
    }
    await pack(inDir, outPath);
    return await fs.readFile(outPath);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/** Compression wrappers that are commonly shipped under a bare `.tar` name. */
type TarContainer =
  | "gzip"
  | "bzip2"
  | "xz"
  | "zstd"
  | "lz4"
  | "compress"
  | "zip"
  | "rar"
  | "7z";

/**
 * Identify the real container by magic bytes. Files served as “something.tar”
 * are frequently gzip/bzip2/xz wrapped, which makes tar-stream report the
 * misleading “Invalid tar header … needs to be gunzipped?” error.
 */
function sniffTarContainer(input: Buffer): TarContainer | null {
  if (input.length < 4) return null;
  if (input[0] === 0x1f && input[1] === 0x8b) return "gzip";
  if (input[0] === 0x42 && input[1] === 0x5a && input[2] === 0x68) return "bzip2"; // BZh
  if (input[0] === 0xfd && input[1] === 0x37 && input[2] === 0x7a && input[3] === 0x58) return "xz";
  if (input[0] === 0x28 && input[1] === 0xb5 && input[2] === 0x2f && input[3] === 0xfd) return "zstd";
  if (input[0] === 0x04 && input[1] === 0x22 && input[2] === 0x4d && input[3] === 0x18) return "lz4";
  if (input[0] === 0x1f && input[1] === 0x9d) return "compress"; // .Z
  // Full 4-byte ZIP signatures only: a tar whose first entry is named “PKG-INFO”
  // (every Python sdist) also starts with “PK”, and must keep working.
  if (input[0] === 0x50 && input[1] === 0x4b && input[2] === 0x03 && input[3] === 0x04) {
    return "zip";
  }
  if (input[0] === 0x50 && input[1] === 0x4b && input[2] === 0x05 && input[3] === 0x06) {
    return "zip"; // empty archive
  }
  if (input[0] === 0x52 && input[1] === 0x61 && input[2] === 0x72 && input[3] === 0x21) return "rar";
  if (input[0] === 0x37 && input[1] === 0x7a && input[2] === 0xbc && input[3] === 0xaf) return "7z";
  return null;
}

const TAR_CONTAINER_LABEL: Record<TarContainer, string> = {
  gzip: "GZIP",
  bzip2: "BZIP2",
  xz: "XZ",
  zstd: "ZSTD",
  lz4: "LZ4",
  compress: "COMPRESS",
  zip: "ZIP",
  rar: "RAR",
  "7z": "7Z",
};

/** 7-Zip needs a real extension on the temp file to pick the right decoder. */
const TAR_CONTAINER_7Z_EXT: Partial<Record<TarContainer, string>> = {
  bzip2: "tar.bz2",
  xz: "tar.xz",
  zstd: "tar.zst",
  lz4: "tar.lz4",
  compress: "tar.Z",
};

/** POSIX/GNU/ustar magic at 257, or a matching v7 header checksum. */
function looksLikeTarHeader(input: Buffer): boolean {
  if (input.length < 512) return false;
  if (input.subarray(257, 262).toString("latin1") === "ustar") return true;
  const stored = parseInt(input.subarray(148, 156).toString("latin1").trim(), 8);
  if (!Number.isFinite(stored)) return false;
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 0x20 : input[i];
  return sum === stored;
}

/** Strip one compression layer with Node's zlib, then 7-Zip as a fallback. */
async function unwrapTarContainer(
  input: Buffer,
  container: TarContainer,
): Promise<Buffer> {
  if (container === "gzip") {
    try {
      return gunzipSync(input);
    } catch {
      // Fall through to 7-Zip for exotic/concatenated gzip streams.
    }
  }
  if (container === "zstd") {
    const zlib = await import("node:zlib");
    const zstdDecompressSync = (
      zlib as unknown as { zstdDecompressSync?: (value: Buffer) => Buffer }
    ).zstdDecompressSync;
    if (typeof zstdDecompressSync === "function") {
      try {
        return Buffer.from(zstdDecompressSync(input));
      } catch {
        // Fall through to 7-Zip.
      }
    }
  }

  const ext = TAR_CONTAINER_7Z_EXT[container];
  if (!ext) {
    throw new Error(`Cannot decompress a ${TAR_CONTAINER_LABEL[container]} wrapper.`);
  }
  const { unpack } = await import("7zip-min");
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-tar-"));
  const inPath = path.join(tmp, `archive.${ext}`);
  const outDir = path.join(tmp, "out");
  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(inPath, input);
    await unpack(inPath, outDir);
    const names = await fs.readdir(outDir);
    const inner = names.find((n) => /\.tar$/i.test(n)) ?? names[0];
    if (!inner) throw new Error("no payload inside wrapper");
    return await fs.readFile(path.join(outDir, inner));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Resolve a `.tar` payload: decompress a wrapper when the extension lied, and
 * fail with an accurate message when the file is a different container type.
 */
async function resolveTarPayload(input: Buffer): Promise<Buffer> {
  const container = sniffTarContainer(input);
  if (!container) return input;
  if (container === "zip" || container === "rar" || container === "7z") {
    throw new Error(
      `this file is a ${TAR_CONTAINER_LABEL[container]} archive, not an uncompressed TAR. ` +
        `Rename it to .${container === "7z" ? "7z" : container} and convert from there.`,
    );
  }
  try {
    return await unwrapTarContainer(input, container);
  } catch (err) {
    throw new Error(
      `could not decompress the ${TAR_CONTAINER_LABEL[container]} wrapper ` +
        `(${err instanceof Error ? err.message : "unknown error"}). ` +
        `The file may be truncated or corrupt.`,
    );
  }
}

export async function extractArchiveEntries(
  input: Buffer,
  src: string,
): Promise<ArchiveEntry[]> {
  if (
    src === "zip" ||
    src === "cbz" ||
    src === "epub" ||
    src === "docx" ||
    src === "pptx" ||
    src === "xlsx" ||
    src === "odt" ||
    src === "ods" ||
    src === "apk" ||
    src === "jar"
  ) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(input);
    const files: ArchiveEntry[] = [];
    for (const [p, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        files.push({ name: p, data: await file.async("nodebuffer") });
      }
    }
    return files;
  }
  if (src === "gz") {
    try {
      const decompressed = gunzipSync(input);
      return [{ name: "content", data: decompressed }];
    } catch {
      return [{ name: "content", data: input }];
    }
  }
  if (src === "tar.gz" || src === "tgz") {
    // A plain TAR renamed .tar.gz is the mirror image of the bug below.
    if (!sniffTarContainer(input) && looksLikeTarHeader(input)) {
      return extractTarBuffer(input);
    }
    const decompressed = gunzipSync(input);
    return extractTarBuffer(decompressed);
  }
  if (src === "tar.zst") {
    try {
      const decompressed = await unwrapTarContainer(input, "zstd");
      return extractTarBuffer(decompressed);
    } catch {
      // Fall back to 7zip extraction below.
    }
  }
  if (src === "tar") {
    return extractTarBuffer(await resolveTarPayload(input));
  }
  if (
    src === "7z" ||
    src === "rar" ||
    src === "tar.bz2" ||
    src === "tar.xz" ||
    src === "tar.zst" ||
    src === "bz2"
  ) {
    return extractWith7zip(input, src);
  }
  return extractWith7zip(input, src);
}
