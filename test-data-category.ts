import { formats } from "./src/lib/formats";
import { convertFile } from "./src/lib/converter";
import * as XLSX from "xlsx";

const csvSample = Buffer.from("name,age,city\nAlice,30,NYC\nBob,25,LA\n", "utf-8");
const jsonSample = Buffer.from(
  '[{"name":"Alice","age":30,"city":"NYC"},{"name":"Bob","age":25,"city":"LA"}]',
  "utf-8",
);
const yamlSample = Buffer.from(
  "items:\n  - name: Alice\n    age: 30\n  - name: Bob\n    age: 25\n",
  "utf-8",
);
const tsvSample = Buffer.from("name\tage\nAlice\t30\nBob\t25\n", "utf-8");
const xmlSample = Buffer.from(
  '<?xml version="1.0"?><root><row><name>Alice</name><age>30</age></row><row><name>Bob</name><age>25</age></row></root>',
  "utf-8",
);
const iniSample = Buffer.from("[section]\nkey=value\nfoo=bar\n", "utf-8");
const envSample = Buffer.from("APP_NAME=zconvert\nDEBUG=true\n", "utf-8");

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ["name", "age", "city"],
  ["Alice", 30, "NYC"],
  ["Bob", 25, "LA"],
]);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const xlsxSample = Buffer.from(
  XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer,
);

const samples: Record<string, Buffer> = {
  csv: csvSample,
  json: jsonSample,
  yaml: yamlSample,
  yml: yamlSample,
  tsv: tsvSample,
  xml: xmlSample,
  ini: iniSample,
  env: envSample,
  xlsx: xlsxSample,
};

const coreTargets = [
  "json",
  "jsonl",
  "csv",
  "tsv",
  "yaml",
  "yml",
  "xml",
  "html",
  "xlsx",
  "ods",
  "xls",
  "ini",
  "toml",
  "env",
];

const binaryOutputs = [
  "parquet",
  "feather",
  "orc",
  "sqlite",
  "dta",
  "sav",
  "xpt",
  "toon",
];

function sniff(buf: Buffer, ext: string): string {
  if (ext === "pdf" && buf.slice(0, 4).toString() === "%PDF") return "pdf-ok";
  if (["xlsx", "ods", "docx"].includes(ext) && buf[0] === 0x50 && buf[1] === 0x4b)
    return "zip-ok";
  if (ext === "xls" && buf[0] === 0xd0) return "xls-ok";
  if (ext === "html" && buf.toString("utf-8", 0, 200).includes("<")) return "html-ok";
  if (
    [
      "json",
      "yaml",
      "yml",
      "xml",
      "csv",
      "tsv",
      "ini",
      "toml",
      "env",
      "jsonl",
      "txt",
      "md",
    ].includes(ext)
  ) {
    const t = buf.toString("utf-8", 0, 500);
    return t.length > 3 ? "text-ok" : "text-short";
  }
  if (binaryOutputs.includes(ext)) {
    const t = buf.toString("utf-8", 0, 80);
    if (t.includes(",") && t.includes("\n")) return "csv-fallback-BUG";
    return `raw:${buf.slice(0, 8).toString("hex")}`;
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

function expectError(dst: string): boolean {
  return binaryOutputs.includes(dst) || dst === "csv" || dst === "json";
}

async function main() {
  const dataFormats = formats.filter((f) => f.category === "data");
  console.log(`Data formats in UI: ${dataFormats.length}\n`);

  console.log("=== CSV -> core targets ===");
  for (const dst of coreTargets) {
    const r = await test("csv", dst, samples.csv);
    console.log(
      `${r.ok ? "PASS" : "FAIL"} csv -> ${dst}`,
      r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70),
    );
  }

  console.log("\n=== JSON -> core targets ===");
  for (const dst of coreTargets) {
    const r = await test("json", dst, samples.json);
    console.log(
      `${r.ok ? "PASS" : "FAIL"} json -> ${dst}`,
      r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70),
    );
  }

  console.log("\n=== XLSX -> core targets ===");
  for (const dst of coreTargets) {
    const r = await test("xlsx", dst, samples.xlsx);
    console.log(
      `${r.ok ? "PASS" : "FAIL"} xlsx -> ${dst}`,
      r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70),
    );
  }

  console.log("\n=== Roundtrips ===");
  for (const [src, mid, back] of [
    ["csv", "json", "csv"],
    ["json", "csv", "json"],
    ["xlsx", "csv", "xlsx"],
  ] as const) {
    const midBuf = await convertFile(samples[src], src, mid);
    const r = await test(mid, back, midBuf);
    console.log(
      `${r.ok ? "PASS" : "FAIL"} ${src} -> ${mid} -> ${back}`,
      r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70),
    );
  }

  console.log("\n=== Cross-category (data -> pdf/txt/md) ===");
  for (const dst of ["pdf", "txt", "md"] as const) {
    const r = await test("csv", dst, samples.csv);
    const bad = r.ok && r.sniff !== (dst === "pdf" ? "pdf-ok" : "text-ok");
    console.log(
      `${bad ? "BUG" : r.ok ? "PASS" : "OK-ERR"} csv -> ${dst}`,
      r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70),
    );
  }

  console.log("\n=== Binary outputs (should error, not CSV garbage) ===");
  for (const src of ["csv", "json", "xlsx"] as const) {
    for (const dst of binaryOutputs) {
      const r = await test(src, dst, samples[src]);
      const bad = r.ok && r.sniff?.includes("csv-fallback");
      const good = !r.ok || expectError(dst);
      console.log(
        `${bad ? "BUG" : good && !r.ok ? "OK-ERR" : r.ok ? "PASS?" : "OK-ERR"} ${src} -> ${dst}`,
        r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 60),
      );
    }
  }

  console.log("\n=== YAML alias (yml) ===");
  const r = await test("yml", "json", samples.yml);
  console.log(
    `${r.ok ? "PASS" : "FAIL"} yml -> json`,
    r.ok ? `${r.size}b ${r.sniff}` : r.error?.slice(0, 70),
  );

  console.log("\n=== Extra formats ===");
  for (const src of ["yaml", "tsv", "xml", "ini", "env"] as const) {
    const r = await test(src, "json", samples[src]);
    console.log(
      `${r.ok ? "PASS" : "FAIL"} ${src} -> json`,
      r.ok ? `${r.size}b` : r.error?.slice(0, 70),
    );
  }
}

main().catch(console.error);
