import { describe, expect, it } from "vitest";
import { changelogEntries } from "@/lib/changelog";

describe("changelogEntries", () => {
  it("has at least one entry", () => {
    expect(changelogEntries.length).toBeGreaterThan(0);
  });

  it("uses unique ids (dates repeat on busy days)", () => {
    const ids = changelogEntries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is ordered newest first", () => {
    const dates = changelogEntries.map((e) => e.date);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it("uses valid ISO dates, none in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const entry of changelogEntries) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.date <= today).toBe(true);
    }
  });

  it("gives every entry a title and at least one item", () => {
    for (const entry of changelogEntries) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.items.length).toBeGreaterThan(0);
      for (const item of entry.items) {
        expect(item.trim().length).toBeGreaterThan(0);
      }
    }
  });
});