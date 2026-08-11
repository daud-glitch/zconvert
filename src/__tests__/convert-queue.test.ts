import { describe, it, expect } from "vitest";
import { compareConvertWaiters } from "@/lib/convert-queue";

describe("compareConvertWaiters", () => {
  it("prefers non-video over video", () => {
    expect(
      compareConvertWaiters(
        { isVideo: false, sizeBytes: 9_000_000, enqueuedAt: 2 },
        { isVideo: true, sizeBytes: 1, enqueuedAt: 1 },
      ),
    ).toBeLessThan(0);
  });

  it("prefers smaller files within the same class", () => {
    expect(
      compareConvertWaiters(
        { isVideo: false, sizeBytes: 100, enqueuedAt: 5 },
        { isVideo: false, sizeBytes: 5000, enqueuedAt: 1 },
      ),
    ).toBeLessThan(0);
  });

  it("uses FIFO when size ties", () => {
    expect(
      compareConvertWaiters(
        { isVideo: false, sizeBytes: 100, enqueuedAt: 1 },
        { isVideo: false, sizeBytes: 100, enqueuedAt: 9 },
      ),
    ).toBeLessThan(0);
  });
});
