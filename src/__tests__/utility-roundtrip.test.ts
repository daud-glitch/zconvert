/**
 * Utility formats (ICS / M3U) are the one place where a conversion can
 * "succeed" while producing nothing useful — toM3u used to drop every record
 * without a url column and return a header-only playlist.
 *
 * These tests assert the output actually carries the input's data.
 */
import { describe, expect, it } from "vitest";
import { convertFile } from "@/lib/converter";

const csv = Buffer.from("name,age\nada,36\ngrace,45\n", "utf8");
const json = Buffer.from(
  JSON.stringify([
    { id: 1, name: "ada" },
    { id: 2, name: "grace" },
  ]),
  "utf8",
);
const txt = Buffer.from("first line\nsecond line\n", "utf8");

describe("utility conversions carry data through", () => {
  const cases: [string, Buffer, string][] = [
    ["csv→m3u", csv, "m3u"],
    ["json→m3u", json, "m3u"],
    ["txt→m3u", txt, "m3u"],
    ["csv→m3u8", csv, "m3u8"],
    ["csv→ics", csv, "ics"],
    ["json→ics", json, "ics"],
    ["txt→ics", txt, "ics"],
  ];

  for (const [name, input, dest] of cases) {
    it(`${name} does not return an empty container`, async () => {
      const out = await convertFile(input, name.split("→")[0]!, dest);
      const text = out.toString("utf8");

      expect(out.length).toBeGreaterThan(0);
      // A header alone means every record was dropped.
      if (dest === "m3u" || dest === "m3u8") {
        expect(text.startsWith("#EXTM3U")).toBe(true);
        expect(text.trim().split("\n").length).toBeGreaterThan(1);
      }
      if (dest === "ics") {
        expect(text).toContain("BEGIN:VCALENDAR");
        expect(text).toContain("BEGIN:VEVENT");
      }
      // Content must echo at least one real value from the input.
      expect(text).toMatch(/ada|grace|first line|second line/i);
    });
  }

  it("round-trips csv → m3u → csv without losing rows", async () => {
    const m3u = await convertFile(csv, "csv", "m3u");
    const back = await convertFile(m3u, "m3u", "csv");
    const text = back.toString("utf8");
    expect(text).toMatch(/ada/);
    expect(text).toMatch(/grace/);
  });
});