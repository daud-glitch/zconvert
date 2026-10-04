/**
 * Every pair advertised in the formats registry must be reachable by the
 * converter. A pair listed in `targetFormats` but rejected at runtime shows up
 * to users as a failed conversion (the "dta → yaml" class of bug).
 *
 * Uses the converter's own exported routing sets so the check cannot drift
 * away from the real convertFile() behaviour.
 */
import { describe, expect, it } from "vitest";
import { formats } from "@/lib/formats";
import {
  archiveOutputFormats,
  audioFormats,
  dataOutputFormats,
  docOutputFormats,
  imageOutputFormats,
  presentationOutputFormats,
  subtitleOutputFormats,
  videoFormats,
} from "@/lib/converter";
import { PDF_RASTER_TARGETS } from "@/lib/pdf-raster-targets";

const byExt = new Map(formats.map((f) => [f.ext, f]));

/** Routing table mirrors convertFile(); each branch names its output set. */
function supportedOutputs(ext: string): Set<string> | null {
  const cat = byExt.get(ext)?.category;
  switch (cat) {
    case "image":
      return imageOutputFormats;
    case "data":
      return new Set([...dataOutputFormats, "ics", "m3u", "m3u8", "jsonl", "ndjson"]);
    case "document":
      // PDF also rasterises, which convertFile() handles before routing.
      return new Set([
        ...docOutputFormats,
        ...PDF_RASTER_TARGETS,
        "json",
        "csv",
        "tsv",
        "xml",
        "yaml",
      ]);
    case "subtitle":
      return subtitleOutputFormats;
    case "archive":
      return archiveOutputFormats;
    case "presentation":
      return presentationOutputFormats;
    case "audio":
      return new Set([...audioFormats, "aiff", "aif", "amr", "caf", "ac3"]);
    case "video":
      return new Set([...videoFormats, ...audioFormats]);
    default:
      return null; // ebook / font / other — handled by dedicated branches
  }
}

describe("advertised conversion pairs", () => {
  const broken: string[] = [];

  for (const f of formats) {
    const supported = supportedOutputs(f.ext);
    if (!supported) continue;
    for (const t of f.targetFormats) {
      if (t === f.ext) continue; // identity returns input early in convertFile
      if (!supported.has(t)) broken.push(`${f.ext} → ${t}`);
    }
  }

  it("has no advertised-but-unreachable pair", () => {
    expect(broken).toEqual([]);
  });

  it("keeps every pair slug parseable (root /x-to-y routes depend on it)", async () => {
    const { getAllConversionPairSlugs, parseConversionSlug } = await import(
      "@/lib/conversion-pairs"
    );
    const slugs = getAllConversionPairSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.filter((s) => !parseConversionSlug(s))).toEqual([]);
  });
});

describe("utility playlist output", () => {
  it("does not emit an empty playlist for records without a url column", async () => {
    const { toM3u } = await import("@/lib/light-text-formats");
    const out = toM3u([
      { name: "ada", age: 36 },
      { name: "grace", age: 45 },
    ]);
    expect(out).toContain("#EXTINF:-1,ada");
    expect(out).toContain("#EXTINF:-1,grace");
    // Must not collapse to just "#EXTM3U" — that shipped as an 8-byte
    // "successful" download users saw as a failed conversion.
    expect(out.trim().split("\n").length).toBeGreaterThan(1);
  });

  it("still prefers a real url when present", async () => {
    const { toM3u } = await import("@/lib/light-text-formats");
    const out = toM3u([{ title: "Song", url: "https://x.test/a.mp3" }]);
    expect(out).toContain("#EXTINF:-1,Song");
    expect(out).toContain("https://x.test/a.mp3");
  });
});

describe("text to PDF output size", () => {
  it("stays small for plain ASCII text (no embedded 1MB font)", async () => {
    const { textToPdf } = await import("@/lib/converter");
    const pdf = await textToPdf("name,age\nada,36\ngrace,45\n");
    // Embedding the Unicode font produced ~570 KB for this input.
    expect(pdf.length).toBeLessThan(60_000);
  });

  it("still embeds a Unicode font when non-ASCII text needs it", async () => {
    const { textToPdf } = await import("@/lib/converter");
    const pdf = await textToPdf("नमस्ते दुनिया — שלום עולם");
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});