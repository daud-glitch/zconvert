import { describe, expect, it } from "vitest";
import {
  matchesAccountKey,
  queueRowsForAccount,
  QUEUE_ACCOUNT_GUEST,
  type StoredQueueItem,
} from "@/lib/storage";

function row(over: Partial<StoredQueueItem>): StoredQueueItem {
  return {
    id: "row",
    accountKey: QUEUE_ACCOUNT_GUEST,
    name: "file.csv",
    ext: "csv",
    size: 3,
    targetFormat: "json",
    quality: 85,
    resizeWidth: null,
    resizeHeight: null,
    status: "pending",
    file: new Blob(["abc"]),
    order: 0,
    ...over,
  };
}

describe("matchesAccountKey", () => {
  it("shows only the active account rows when logged in", () => {
    expect(matchesAccountKey("user-a", "user-a")).toBe(true);
    expect(matchesAccountKey("user-b", "user-a")).toBe(false);
    expect(matchesAccountKey(null, "user-a")).toBe(false);
    expect(matchesAccountKey(undefined, "user-a")).toBe(false);
  });

  it("never shows history without a logged-in account", () => {
    expect(matchesAccountKey(null, null)).toBe(false);
    expect(matchesAccountKey(undefined, null)).toBe(false);
    expect(matchesAccountKey(null, undefined)).toBe(false);
    expect(matchesAccountKey("user-a", null)).toBe(false);
    expect(matchesAccountKey("user-a", undefined)).toBe(false);
  });
});

describe("queueRowsForAccount", () => {
  const rows = [
    row({ id: "a2", accountKey: "user-a", name: "a2.csv", order: 2 }),
    row({ id: "guest1", accountKey: QUEUE_ACCOUNT_GUEST, name: "g.csv", order: 1 }),
    row({ id: "a1", accountKey: "user-a", name: "a1.csv", order: 0 }),
    row({ id: "b1", accountKey: "user-b", name: "b1.csv", order: 3 }),
  ];

  it("returns only the account's own rows, in queue order", () => {
    expect(queueRowsForAccount(rows, "user-a").map((r) => r.name)).toEqual([
      "a1.csv",
      "a2.csv",
    ]);
  });

  it("never leaks another account's or the guest queue", () => {
    expect(queueRowsForAccount(rows, "user-b").map((r) => r.name)).toEqual([
      "b1.csv",
    ]);
    expect(queueRowsForAccount(rows, QUEUE_ACCOUNT_GUEST).map((r) => r.name)).toEqual([
      "g.csv",
    ]);
    expect(queueRowsForAccount(rows, "user-c")).toEqual([]);
  });

  it("drops rows whose file blob is missing or empty", () => {
    const broken = [
      row({ id: "x", accountKey: "user-a", file: new Blob([]) }),
      row({ id: "y", accountKey: "user-a", file: undefined as never }),
      row({ id: "z", accountKey: "user-a", name: "ok.csv" }),
    ];
    expect(queueRowsForAccount(broken, "user-a").map((r) => r.name)).toEqual([
      "ok.csv",
    ]);
  });

  it("drops rows written before account scoping existed", () => {
    const legacy = [row({ id: "old", accountKey: undefined as never })];
    expect(queueRowsForAccount(legacy, QUEUE_ACCOUNT_GUEST)).toEqual([]);
    expect(queueRowsForAccount(legacy, "user-a")).toEqual([]);
  });
});
