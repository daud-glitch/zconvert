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
