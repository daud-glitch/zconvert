// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readSavRecords } from "@/lib/format-readers";
import { convertFile } from "@/lib/converter";

describe("SAV reader", () => {
  it("reads basic SPSS fixture and converts to JSON", async () => {
    const url =
      "https://raw.githubusercontent.com/everydaydesign/datareader-spss/main/oracle/fixtures/basic.sav";
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    const buf = Buffer.from(await res.arrayBuffer());

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
    const url =
      "https://raw.githubusercontent.com/everydaydesign/datareader-spss/main/oracle/fixtures/basic.sav";
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    const raw = new Uint8Array(await res.arrayBuffer());
    const withBom = new Uint8Array(raw.length + 3);
    withBom.set([0xef, 0xbb, 0xbf], 0);
    withBom.set(raw, 3);
    const rows = await readSavRecords(Buffer.from(withBom));
    expect(rows.length).toBeGreaterThan(0);
  });

  it("reads ZSAV (zlib) fixture", async () => {
    const url =
      "https://raw.githubusercontent.com/everydaydesign/datareader-spss/main/oracle/fixtures/zsav.sav";
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    const buf = Buffer.from(await res.arrayBuffer());
    const rows = await readSavRecords(buf);
    expect(rows.length).toBeGreaterThan(0);
  });
});
