import { describe, expect, it } from "vitest";
import { detectSourceExt } from "@/lib/api/convert-handler";

describe("detectSourceExt", () => {
  it("prefers a registered compound extension", () => {
    expect(detectSourceExt("backup.tar.bz2")).toBe("tar.bz2");
    expect(detectSourceExt("backup.TAR.XZ")).toBe("tar.xz");
    expect(detectSourceExt("backup.tar.zst")).toBe("tar.zst");
    expect(detectSourceExt("backup.tar.gz")).toBe("tar.gz");
  });

  it("falls back to the last segment for simple names", () => {
    expect(detectSourceExt("photo.JPG")).toBe("jpg");
    expect(detectSourceExt("archive.rar")).toBe("rar");
    expect(detectSourceExt("no-extension")).toBe("");
  });
});
