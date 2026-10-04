/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csv escaping", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("pdf")).toBe("pdf");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(true)).toBe("true");
  });

  it("renders null and undefined as empty cells", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas so columns do not shift", () => {
    expect(csvCell("ffmpeg exited with code 1, status=2")).toBe(
      '"ffmpeg exited with code 1, status=2"',
    );
  });

  it("doubles embedded quotes", () => {
    expect(csvCell('bad "codec"')).toBe('"bad ""codec"""');
  });

  it("quotes newlines and carriage returns", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("preserves a realistic conversion error end to end", () => {
    const error =
      'Conversion failed: "Invalid data found when processing" (exit 1)\nSee docs.';
    const rows = [["timestamp", "error"], ["2026-10-04T10:00:00.000Z", error]];
    const csv = toCsv(rows);

    // Header + one record. The newline inside the error must not split it into
    // an extra row.
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(2);
    expect(csv).toContain(
      '"Conversion failed: ""Invalid data found when processing"" (exit 1)\nSee docs."',
    );
  });

  it("starts with a UTF-8 BOM and uses CRLF endings", () => {
    const csv = toCsv([["a", "b"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("a,b\r\n");
  });

  it("emits only a header when there are no rows", () => {
    const csv = toCsv([["pair", "failures"]]);
    expect(csv.replace("﻿", "")).toBe("pair,failures\r\n");
  });
});