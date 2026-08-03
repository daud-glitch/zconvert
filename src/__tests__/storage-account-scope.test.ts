import { describe, expect, it } from "vitest";
import { matchesAccountKey } from "@/lib/storage";

describe("matchesAccountKey", () => {
  it("shows only the active account rows when logged in", () => {
    expect(matchesAccountKey("user-a", "user-a")).toBe(true);
    expect(matchesAccountKey("user-b", "user-a")).toBe(false);
    expect(matchesAccountKey(null, "user-a")).toBe(false);
    expect(matchesAccountKey(undefined, "user-a")).toBe(false);
  });

  it("shows only guest/untagged rows when logged out", () => {
    expect(matchesAccountKey(null, null)).toBe(true);
    expect(matchesAccountKey(undefined, null)).toBe(true);
    expect(matchesAccountKey(null, undefined)).toBe(true);
    expect(matchesAccountKey("user-a", null)).toBe(false);
    expect(matchesAccountKey("user-a", undefined)).toBe(false);
  });
});
