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
 * Production reported these as failures:
 *   DTA Parse Error: Cannot read properties of undefined (reading 'length')
 *   DTA Parse Error: Cannot read properties of undefined (reading '1')
 *
 * Both came from the unmaintained `dta` package: it cannot resolve strL
 * (long-string) cells and its value-label pass walks a SheetJS internal the
 * installed xlsx no longer produces. `readDtaRecords` now falls back to
 * src/lib/dta-reader.ts, so these are pinned as successes.
 *
 * Expected values were cross-checked against pandas' read_stata.
 */
describe("DTA features the dta package could not read", () => {
  it.each([117, 118, 119])(
    "reads strings longer than 2045 characters (release %i)",
    async (release) => {
      const rows = await readDtaRecords(read(`v_strl${release}.dta`));
      expect(rows).toHaveLength(2);
      expect(rows[0].t).toHaveLength(3000);
      expect(rows[1].t).toHaveLength(2500);
    },
  );

  it.each([117, 118])(
    "leaves a missing long string empty instead of crashing (release %i)",
    async (release) => {
      const rows = await readDtaRecords(read(`v_strlmissing${release}.dta`));
      expect(rows).toHaveLength(3);
      expect(String(rows[0].t)).toHaveLength(3000);
      expect(rows[1].t).toBe("");
      expect(String(rows[2].t)).toHaveLength(2500);
    },
  );

  it("resolves categorical value labels to their text", async () => {
    const rows = await readDtaRecords(read("v_valuelabels.dta"));
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.grade)).toEqual(["A", "B", "A"]);
  });

  it.each([117, 118, 119])(
    "reads labels and long strings together (release %i)",
    async (release) => {
      const rows = await readDtaRecords(read(`v_valuelabels${release}.dta`));
      expect(rows).toHaveLength(3);
      // The third category is missing, which Stata stores as a missing byte.
      expect(rows.map((r) => r.g)).toEqual(["A", "B", null]);
      expect(rows[0].n).toBe(1.5);
      expect(String(rows[0].t)).toHaveLength(3000);
    },
  );

  it("still reports a clear error for a file it cannot read", async () => {
    await expect(
      readDtaRecords(Buffer.from("<stata_dta><header><release>117")),
    ).rejects.toThrow(/DTA Parse Error/);
  });
});