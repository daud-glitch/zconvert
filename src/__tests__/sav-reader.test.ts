// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readSavRecords } from "@/lib/format-readers";
import { convertFile } from "@/lib/converter";
import { humanizeConversionError } from "@/lib/upload-limits";
import fs from "fs";
import path from "path";

const FIXTURE_DIR = path.join(__dirname, "fixtures");

function readFixture(name: string): Buffer {
  try {
    return fs.readFileSync(path.join(FIXTURE_DIR, name));
  } catch {
    return fs.readFileSync(
      path.join(__dirname, "..", "..", "tmp-savprobe", name),
    );
  }
}

describe("SAV reader", () => {
  it("reads basic SPSS fixture and converts to JSON", async () => {
    const buf = readFixture("basic.sav");

    const rows = await readSavRecords(buf);
    expect(rows.length).toBeGreaterThan(0);
    expect(Object.keys(rows[0]!).length).toBeGreaterThan(0);

    const json = await convertFile(buf, "sav", "json");
    const parsed = JSON.parse(json.toString("utf-8")) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(rows.length);

    const csv = await convertFile(buf, "sav", "csv");
    expect(csv.toString("utf-8")).toContain(",");
  });

  it("reads SAV with UTF-8 BOM prefix", async () => {
    const raw = new Uint8Array(readFixture("basic.sav"));
    const withBom = new Uint8Array(raw.length + 3);
    withBom.set([0xef, 0xbb, 0xbf], 0);
    withBom.set(raw, 3);
    const rows = await readSavRecords(Buffer.from(withBom));
    expect(rows.length).toBeGreaterThan(0);
  });

  it("reads ZSAV (zlib) fixture", async () => {
    const buf = readFixture("zsav.sav");
    const rows = await readSavRecords(buf);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("names the real format when a non-SPSS file is renamed to .sav", async () => {
    const cases: [string, Buffer, RegExp][] = [
      [
        "csv",
        Buffer.from("name,age\r\nada,36\r\ngrace,45\r\n", "utf8"),
        /plain text\/CSV/i,
      ],
      ["csv-lf", Buffer.from("name,age\nada,36\n", "utf8"), /plain text\/CSV/i],
      ["xlsx-like zip", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]), /zip/i],
      ["legacy office", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]), /office/i],
    ];

    for (const [label, buf, expected] of cases) {
      await expect(readSavRecords(buf), label).rejects.toThrow(expected);
    }
  });

  it("surfaces the specific reason to the user, not a generic failure", async () => {
    const err = await readSavRecords(
      Buffer.from("name,age\r\nada,36\r\n", "utf8"),
    ).catch((e: unknown) => e as Error);
    const message = humanizeConversionError(
      err instanceof Error ? err.message : String(err),
    );
    expect(message).toMatch(/CSV/i);
    expect(message).not.toMatch(/tech team notified/i);
  });

  it("handles non-SPSS binary save (header 83050000) gracefully to XML and JSON", async () => {
    const buf = Buffer.from([
      0x83, 0x05, 0x00, 0x00, 0x54, 0x45, 0x53, 0x54, 0x5f, 0x53, 0x41, 0x56,
      0x45,
    ]);
    const xml = await convertFile(buf, "sav", "xml");
    const xmlStr = xml.toString("utf-8");
    expect(xmlStr).toContain("<?xml");
    expect(xmlStr).toContain("0x000000");

    const json = await convertFile(buf, "sav", "json");
    const parsed = JSON.parse(json.toString("utf-8")) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("handles malformed JSON with leading dot/garbage (.   4 f   ) gracefully to CSV", async () => {
    const dirtyJson = Buffer.from(
      '.   4 f   [{"id": 101, "name": "Project Beta"}]',
      "utf8",
    );
    const csv = await convertFile(dirtyJson, "json", "csv");
    const csvStr = csv.toString("utf8");
    expect(csvStr).toContain("101");
    expect(csvStr).toContain("Project Beta");

    const pureJunk = Buffer.from(".   4 f   ", "utf8");
    const csvJunk = await convertFile(pureJunk, "json", "csv");
    expect(csvJunk.toString("utf8").length).toBeGreaterThan(0);
  });
});
