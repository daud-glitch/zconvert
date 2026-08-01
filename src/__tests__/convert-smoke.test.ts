/**
 * Conversion smoke tests — node environment (sharp/ffmpeg-friendly).
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { convertFile } from "@/lib/converter";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

describe("conversion smoke", () => {
  it("converts PNG → JPEG", async () => {
    const png = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 20, g: 160, b: 80 },
      },
    })
      .png()
      .toBuffer();

    const out = await convertFile(png, "png", "jpg", 80);
    expect(out.length).toBeGreaterThan(50);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
  }, 30_000);

  it("converts CSV → JSON", async () => {
    const csv = Buffer.from("name,score\nalice,10\nbob,20\n", "utf-8");
    const out = await convertFile(csv, "csv", "json");
    const parsed = JSON.parse(out.toString("utf-8"));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toMatchObject({ name: "alice" });
  });

  it("converts SRT → VTT", async () => {
    const srt = Buffer.from(
      "1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n",
      "utf-8",
    );
    const out = await convertFile(srt, "srt", "vtt");
    const text = out.toString("utf-8");
    expect(text).toContain("WEBVTT");
    expect(text).toContain("Hello world");
  });

  it("converts SRT → SBV and ICS → JSON", async () => {
    const srt = Buffer.from(
      "1\n00:00:01,000 --> 00:00:03,000\nHello\n\n",
      "utf-8",
    );
    const sbv = (await convertFile(srt, "srt", "sbv")).toString("utf-8");
    expect(sbv).toContain("Hello");

    const ics = Buffer.from(
      "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Meet\r\nDTSTART:20240101T100000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n",
      "utf-8",
    );
    const json = JSON.parse(
      (await convertFile(ics, "ics", "json")).toString("utf-8"),
    );
    expect(json[0].summary).toBe("Meet");
  });

  it("converts GeoJSON → CSV", async () => {
    const geo = Buffer.from(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Karachi" },
            geometry: { type: "Point", coordinates: [67.0, 24.8] },
          },
        ],
      }),
      "utf-8",
    );
    const csv = (await convertFile(geo, "geojson", "csv")).toString("utf-8");
    expect(csv.toLowerCase()).toContain("karachi");
  });

  it("merges two PDFs with pdf-lib (split/merge building block)", async () => {
    const makeOnePage = async (label: string) => {
      const doc = await PDFDocument.create();
      const page = doc.addPage([200, 200]);
      page.drawText(label, { x: 40, y: 100, size: 12 });
      return Buffer.from(await doc.save());
    };

    const a = await makeOnePage("A");
    const b = await makeOnePage("B");
    const merged = await PDFDocument.create();
    for (const buf of [a, b]) {
      const src = await PDFDocument.load(buf);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    const out = Buffer.from(await merged.save());
    const check = await PDFDocument.load(out);
    expect(check.getPageCount()).toBe(2);
  });
});
