/**
 * Binary / legacy format readers (dynamic imports to limit bundle impact).
 */
import fs from "fs/promises";
import { createRequire } from "module";
import os from "os";
import path from "path";
import { gunzipSync } from "zlib";
import { XMLParser } from "fast-xml-parser";
import * as tar from "tar-stream";
import { extractRarWithToolchain } from "@/lib/external-toolchain";

/** sav-reader is CJS-only (`exports.require`); Turbopack cannot resolve ESM import. */
const nodeRequire = createRequire(
  path.join(/* turbopackIgnore: true */ process.cwd(), "package.json"),
);

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
export async function readParquetRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const { parquetReadObjects } = await import("hyparquet");
  const rows = await parquetReadObjects({
    file: new Uint8Array(input).buffer as ArrayBuffer,
  });
  return rows as Record<string, unknown>[];
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
export async function readSavRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const { SavBufferReader } = nodeRequire("sav-reader") as {
    SavBufferReader: new (buf: Buffer) => {
      open(): Promise<void>;
      readAllRows(): Promise<unknown[][]>;
      meta?: { variables?: { name?: string; label?: string }[] };
    };
  };
  const sav = new SavBufferReader(input);
  await sav.open();
  const rows = await sav.readAllRows();
  const vars = sav.meta?.variables ?? [];
  const names = vars.map(
    (v: { name?: string; label?: string }, i: number) =>
      v.name || v.label || `var${i + 1}`,
  );
  return (rows as unknown[][]).map((row) => {
    const rec: Record<string, unknown> = {};
    names.forEach((n: string, i: number) => {
      rec[n] = row[i];
    });
    return rec;
  });
}

// ─── Feather / Arrow IPC ───────────────────────────────────────────────────
export async function readFeatherRecords(
  input: Buffer,
): Promise<Record<string, unknown>[]> {
  const arrow = await import("apache-arrow");
  const table = arrow.tableFromIPC(new Uint8Array(input));
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

  try {
    const wb = DTA.parse(view) as {
      Sheets: Record<string, XLSX.WorkSheet>;
      SheetNames: string[];
    };
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  } catch (err) {
    throw new Error(
      `DTA Parse Error: ${err instanceof Error ? err.message : "The file structure is invalid or unsupported."}`,
    );
  }
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

export async function extractDrawioContent(input: Buffer): Promise<{
  text: string;
  png?: Buffer;
}> {
  const xml = decodeDrawioXml(input);
  if (!xml.includes("<mxfile") && !xml.includes("<mxGraphModel")) {
    if (input[0] === 0x50 && input[1] === 0x4b) {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(input);
      const diagram = Object.keys(zip.files).find((k) =>
        k.endsWith(".xml"),
      );
      if (diagram) {
        const inner = await zip.file(diagram)?.async("string");
        if (inner) return extractDrawioContent(Buffer.from(inner, "utf-8"));
      }
    }
    throw new Error("Unrecognized DrawIO file structure");
  }
  const labels: string[] = [];
  const imgMatch = xml.match(
    /image=data:image\/png;base64,([A-Za-z0-9+/=]+)/,
  );
  const re = /value="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const v = m[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (v && !v.startsWith("data:")) labels.push(v);
  }
  const text = labels.join("\n");
  const result: { text: string; png?: Buffer } = {
    text: text || "DrawIO diagram",
  };
  if (imgMatch?.[1]) {
    try {
      result.png = Buffer.from(imgMatch[1], "base64");
    } catch {
      /* ignore bad base64 */
    }
  }
  return result;
}

// ─── P7M (PKCS#7) ────────────────────────────────────────────────────────
export async function extractP7mContent(input: Buffer): Promise<Buffer> {
  const forge = await import("node-forge");
  const f = forge.default;
  const asn1 = f.asn1.fromDer(f.util.createBuffer(input.toString("binary")));
  const p7 = f.pkcs7.messageFromAsn1(asn1) as {
    content?: string | { getBytes?: () => string };
  };
  const content = p7.content;
  if (typeof content === "string") {
    return Buffer.from(content, "binary");
  }
  if (content && typeof content.getBytes === "function") {
    return Buffer.from(content.getBytes(), "binary");
  }
  throw new Error("Could not extract content from P7M signature");
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
    const viaUnrar = await extractRarWithToolchain(input);
    if (viaUnrar && viaUnrar.length > 0) return viaUnrar;
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
        throw new Error(
          `Could not extract RAR archive. Install UnRAR/WinRAR (or set UNRAR_BIN), or ensure RAR_BIN is available. ` +
            `Details: ${err instanceof Error ? err.message : "unknown error"}. ` +
            `The file may also be password-protected or corrupt.`,
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
    src === "ods"
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
    const decompressed = gunzipSync(input);
    return extractTarBuffer(decompressed);
  }
  if (src === "tar.zst") {
    try {
      const zlib = await import("node:zlib");
      const zstdDecompressSync = (
        zlib as unknown as { zstdDecompressSync?: (value: Buffer) => Buffer }
      ).zstdDecompressSync;
      if (typeof zstdDecompressSync === "function") {
        const decompressed = Buffer.from(zstdDecompressSync(input));
        return extractTarBuffer(decompressed);
      }
    } catch {
      // Fall back to 7zip extraction below.
    }
  }
  if (src === "tar") {
    return extractTarBuffer(input);
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
