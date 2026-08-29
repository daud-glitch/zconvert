import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/db", () => ({
  getOptionalDb: () => ({
    format: {
      findFirst: mockFindFirst,
      count: mockCount,
    },
  }),
}));

describe("resolveFormatByExt", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCount.mockReset();
  });

  it("falls back to static catalog when format is missing from DB", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { resolveFormatByExt } = await import("@/lib/format-catalog");
    const fmt = await resolveFormatByExt("apk");

    expect(fmt).not.toBeNull();
    expect(fmt?.ext).toBe("apk");
    expect(fmt?.category).toBe("archive");
    expect(fmt?.source).toBe("static");
    expect(fmt?.targetFormats).toContain("zip");
  });

  it("returns null when format exists in DB but is disabled", async () => {
    mockFindFirst.mockResolvedValue({
      ext: "apk",
      name: "APK",
      enabled: false,
      category: { name: "archive", enabled: true },
      targetFormats: '["zip"]',
    });

    const { resolveFormatByExt } = await import("@/lib/format-catalog");
    const fmt = await resolveFormatByExt("apk");

    expect(fmt).toBeNull();
  });
});
