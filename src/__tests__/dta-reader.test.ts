/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { readDtaRecords } from "@/lib/format-readers";

const FIX = path.join(__dirname, "fixtures");
const read = (name: string) => fs.readFileSync(path.join(FIX, name));

describe("DTA reading", () => {
  it("reads a Stata 117 file", async () => {
    const rows = await readDtaRecords(read("sample117.dta"));
    expect(rows.length).toBe(3);
    expect(rows[0].name).toBe("alpha");
  });

  it("reads a Stata 118 file", async () => {
    const rows = await readDtaRecords(read("sample118.dta"));
    expect(rows).toHaveLength(3);
    expect(rows[2].name).toBe("gamma");
  });

  it("reads a large file", async () => {
    const rows = await readDtaRecords(read("dta_large117.dta"));
    expect(rows.length).toBe(5000);
  });

  it("keeps non-ASCII text intact", async () => {
    const rows = await readDtaRecords(read("v_unicode.dta"));
    expect(rows.map((r) => r.name)).toContain("日本語テスト");
  });

  it("reads mixed column types", async () => {
    const rows = await readDtaRecords(read("v_types.dta"));
    expect(rows).toHaveLength(3);
    expect(Object.keys(rows[0])).toEqual(
      expect.arrayContaining(["when", "flag", "small", "u16", "i32", "f32"]),
    );
  });

  it("reads strings at the long-string boundary", async () => {
    // 2045 chars is still a fixed-width field, not a strL reference.
    const rows = await readDtaRecords(read("v_strl2045.dta"));
    expect(String(rows[0].text)).toHaveLength(2045);
  });
});

/**
 * Known limitations.
 *
 * The `dta` npm package (v0.0.2, unmaintained) throws an internal TypeError on
 * two features real Stata files use. These are characterised here so the
 * behaviour is visible and cannot change silently; when the reader is replaced
 * these two assertions should be flipped to expect success.
 *
 * Observed in production as:
 *   DTA Parse Error: Cannot read properties of undefined (reading '1')
 *   DTA Parse Error: Cannot read properties of undefined (reading 'length')
 */
describe("DTA reader known gaps", () => {
  it("fails on strL fields (long strings), not on user error", async () => {
    await expect(readDtaRecords(read("v_strl.dta"))).rejects.toThrow(
      /DTA Parse Error/,
    );
  });

  it("fails on categorical value labels", async () => {
    await expect(readDtaRecords(read("v_valuelabels.dta"))).rejects.toThrow(
      /DTA Parse Error/,
    );
  });
});