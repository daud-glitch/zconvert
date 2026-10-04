import { describe, it, expect } from "vitest";
import { type FileItem } from "@/lib/app-types";
import {
  acceptForPreferredFrom,
  canPreviewResult,
  formatSizeChangeLabel,
  getMergeSourceBlob,
  mergeOutputFileName,
  normalizeExtParam,
  resolveDefaultTargetFormat,
  syncPreferredPairUrl,
  targetsForExt,
  uniqueZipEntryName,
} from "@/lib/converter-helpers";

function item(over: Partial<FileItem>): FileItem {
  return {
    id: "1",
    name: "file.pdf",
    ext: "pdf",
    targetFormat: "pdf",
    status: "pending",
    progress: 0,
    size: 100,
    outputSize: 0,
    file: new Blob(["x"]) as File,
    ...over,
  } as FileItem;
}

describe("converter helpers", () => {
  it("identifies PDF merge sources", () => {
    const pdf = new Blob(["p"]) as File;
    expect(getMergeSourceBlob(item({ file: pdf, ext: "pdf" }))).toBe(pdf);
    expect(
      getMergeSourceBlob(
        item({ ext: "docx", targetFormat: "pdf", file: pdf }),
      ),
    ).toBeNull();
    const result = new Blob(["out"]) as File;
    expect(
      getMergeSourceBlob(
        item({ ext: "docx", targetFormat: "pdf", status: "done", result }),
      ),
    ).toBe(result);
    expect(
      getMergeSourceBlob(
        item({ ext: "pdf", targetFormat: "pdf", outputPackage: "zip" }),
      ),
    ).toBeNull();
  });

  it("names merge output files", () => {
    expect(mergeOutputFileName(item({ name: "a.pdf" }))).toBe("a.pdf");
    expect(mergeOutputFileName(item({ name: "a.PDF" }))).toBe("a.PDF");
    expect(mergeOutputFileName(item({ name: "a.txt", ext: "txt" }))).toBe(
      "a.pdf",
    );
    expect(
      mergeOutputFileName(item({ name: "b.docx", ext: "docx", targetFormat: "pdf" })),
    ).toBe("b.pdf");
  });

  it("prefers the API target map, then falls back to the catalog", () => {
    expect(targetsForExt("pdf", { pdf: ["docx"] })).toEqual(["docx"]);
    expect(targetsForExt("pdf", {})).toContain("docx");
    expect(targetsForExt("not-a-format", {})).toEqual([]);
  });

  it("formats size changes without absurd percentages", () => {
    expect(formatSizeChangeLabel(0, 100)).toBe("—");
    expect(formatSizeChangeLabel(100, 50)).toBe("↓50%");
    expect(formatSizeChangeLabel(100, 100)).toBe("same");
    // Uncompressed WAV output would otherwise read as "↑13428%".
    expect(formatSizeChangeLabel(1, 1024)).toBe("↑1024×");
    // From 2x up the label switches to a multiplier.
    expect(formatSizeChangeLabel(100, 250)).toBe("↑2.5×");
    expect(formatSizeChangeLabel(100, 150)).toBe("↑50%");
    expect(formatSizeChangeLabel(100, 199)).toBe("↑99%");
  });

  it("only previews raster and pdf results", () => {
    const result = new Blob(["r"]) as File;
    expect(canPreviewResult(item({ result, targetFormat: "png" }))).toBe(true);
    expect(canPreviewResult(item({ result, targetFormat: "zip" }))).toBe(false);
    expect(
      canPreviewResult(item({ result: undefined, targetFormat: "png" })),
    ).toBe(false);
    expect(canPreviewResult(item({ result, targetFormat: "mp4" }))).toBe(false);
  });

  it("de-duplicates zip entry names", () => {
    const used = new Set<string>();
    expect(uniqueZipEntryName(used, "a.pdf")).toBe("a.pdf");
    expect(uniqueZipEntryName(used, "a.pdf")).toBe("a-2.pdf");
    expect(uniqueZipEntryName(used, "a.pdf")).toBe("a-3.pdf");
    expect(uniqueZipEntryName(used, "noext")).toBe("noext");
    expect(uniqueZipEntryName(used, "noext")).toBe("noext-2");
  });

  it("normalizes ext params", () => {
    expect(normalizeExtParam(".PDF")).toBe("pdf");
    expect(normalizeExtParam(null)).toBe("");
  });

  it("expands the accept attribute for jpeg", () => {
    expect(acceptForPreferredFrom("jpg")).toBe(".jpg,.jpeg,.jpe");
    expect(acceptForPreferredFrom("pdf")).toBe(".pdf");
  });

  it("resolves the default target format", () => {
    expect(resolveDefaultTargetFormat("pdf", ["docx", "txt"], null, "txt")).toBe(
      "txt",
    );
    // A preferred target only applies to the preferred source, so a .png file
    // falls through to the first target that is not itself.
    expect(
      resolveDefaultTargetFormat("png", ["pdf", "txt"], "pdf", "txt"),
    ).toBe("pdf");
    expect(resolveDefaultTargetFormat("pdf", ["pdf", "docx"], null, null)).toBe(
      "pdf",
    );
    expect(resolveDefaultTargetFormat("pdf", ["pdf"], null, null)).toBe("pdf");
    expect(resolveDefaultTargetFormat("png", ["png", "webp"], null, null)).toBe(
      "webp",
    );
    expect(resolveDefaultTargetFormat("png", [], null, null)).toBe("");
  });

  it("syncs the preferred pair into the URL", () => {
    syncPreferredPairUrl("pdf", "docx");
    expect(window.location.search).toBe("?from=pdf&to=docx");
    syncPreferredPairUrl(null, "docx");
    expect(window.location.search).toBe("?to=docx");
    syncPreferredPairUrl(null, null);
    expect(window.location.search).toBe("");
  });
});