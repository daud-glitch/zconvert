/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { writeSav } from "@irbisadm/statfmt";
import { readSavRecords } from "@/lib/format-readers";
import { convertFile } from "@/lib/converter";

const VARIABLES = [
  { name: "id", type: 0 as const, storageWidth: 8 },
  { name: "value", type: 0 as const, storageWidth: 8 },
];

/**
 * Two failures that reached users as hard errors:
 *
 * 1. A dataset with variables but zero cases is valid SPSS output, but the
 *    reader required `records.length > 0`, so it was reported as
 *    "SAV file contains no data rows".
 * 2. An upload truncated mid-transfer still has a readable header and usually a
 *    readable case block. statfmt can return those rows when given a rowLimit,
 *    but only after the full read fails and we retry with a smaller limit.
 */
describe("SAV edge cases", () => {
  it("converts a valid dataset that has zero cases", async () => {
    const buf = Buffer.from(writeSav({ variables: VARIABLES, rows: [] }));

    await expect(readSavRecords(buf)).resolves.toEqual([]);

    const parsed = JSON.parse(
      (await convertFile(buf, "sav", "json")).toString("utf-8"),
    ) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toEqual([]);
  });

  it("recovers the readable rows from a truncated upload", async () => {
    const full = Buffer.from(
      writeSav({
        variables: VARIABLES,
        rows: [
          [1, 10],
          [2, 20],
          [3, 30],
        ],
      }),
    );
    const cut = full.subarray(0, full.length - 4);
    expect(cut.length).toBeLessThan(full.length);

    const records = await readSavRecords(cut);
    expect(records.length).toBeGreaterThan(0);
    expect(Object.keys(records[0] as object)).toEqual(["id", "value"]);
  });
});