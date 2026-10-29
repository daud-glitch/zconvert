import { beforeEach, describe, expect, it, vi } from "vitest";

const { openDB } = vi.hoisted(() => ({ openDB: vi.fn() }));

vi.mock("idb", () => ({ openDB }));

function fakeDb(rows: unknown[] = []) {
  return {
    close: vi.fn(),
    getAllFromIndex: vi.fn().mockResolvedValue(rows),
  };
}

describe("local storage connection", () => {
  beforeEach(() => {
    vi.resetModules();
    openDB.mockReset();
  });

  it("keeps the pooled connection usable after primeStorage", async () => {
    const first = fakeDb();
    openDB.mockResolvedValueOnce(first);

    const { primeStorage, getLocalHistory } = await import("@/lib/storage");

    await primeStorage();
    expect(first.close).not.toHaveBeenCalled();

    // A closed connection throws "Can't start a transaction on a closed
    // database", so this must use the same live handle.
    await expect(getLocalHistory(5, "acct-1")).resolves.toEqual([]);
    expect(openDB).toHaveBeenCalledTimes(1);
    expect(first.getAllFromIndex).toHaveBeenCalled();
  });

  it("reopens and retries a read when the connection closed mid-flight", async () => {
    const closed = Object.assign(
      new Error("Can't start a transaction on a closed database"),
      { name: "InvalidStateError" },
    );
    const first = fakeDb();
    first.getAllFromIndex.mockRejectedValueOnce(closed);
    const second = fakeDb();
    openDB.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const { getLocalHistory } = await import("@/lib/storage");

    await expect(getLocalHistory(5, "acct-1")).resolves.toEqual([]);
    expect(openDB).toHaveBeenCalledTimes(2);
    expect(second.getAllFromIndex).toHaveBeenCalledTimes(1);
  });

  it("does not reopen for unrelated storage errors", async () => {
    const quota = Object.assign(new Error("Quota exceeded"), {
      name: "QuotaExceededError",
    });
    const first = fakeDb();
    first.getAllFromIndex.mockRejectedValueOnce(quota);
    openDB.mockResolvedValueOnce(first);

    const { getLocalHistory } = await import("@/lib/storage");

    await expect(getLocalHistory(5, "acct-1")).rejects.toThrow("Quota exceeded");
    expect(openDB).toHaveBeenCalledTimes(1);
  });
});
