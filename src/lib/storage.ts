"use client";

import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "zconvert-storage";
const FILES_STORE = "files";
const HISTORY_STORE = "history";
const DB_VERSION = 4;
const MAX_HISTORY_ENTRIES = 200;

/** Local conversion history + optional result blob (browser-only). */
export interface LocalHistoryEntry {
  id: string;
  fileName: string;
  originalExt: string;
  targetExt: string;
  category: string;
  inputSize: number;
  outputSize: number;
  status: "done" | "error";
  duration: number | null;
  error: string | null;
  createdAt: string;
  mimeType?: string;
  /** Converted output — present while user keeps the file */
  data?: Blob;
  hasFile: boolean;
  /** Optional logged-in account id for filtering on shared devices */
  accountKey?: string | null;
}

/** Legacy blob-only shape (v1). */
interface StoredFileV1 {
  id: string;
  fileName: string;
  data: Blob;
  mimeType: string;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * History / downloads are account-only.
 * Guest (no accountKey) never matches — nothing is shown or stored for guests.
 */
export function matchesAccountKey(
  entryKey: string | null | undefined,
  accountKey: string | null | undefined,
): boolean {
  if (!accountKey) return false;
  return entryKey === accountKey;
}

/**
 * Open the DB once so schema migrations (e.g. dropping the queue store) run.
 *
 * The connection stays pooled for the tab. Closing it here used to leave the
 * cached promise pointing at a closed connection, so the next history read or
 * write threw "Can't start a transaction on a closed database". A connection
 * another tab needs to upgrade is released by the `blocking` handler instead.
 */
export async function primeStorage(): Promise<void> {
  await getDB();
}

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // Another tab upgrading the schema closes this connection; drop the
      // cached handle so the next operation reopens rather than throwing.
      terminated() {
        dbPromise = null;
      },
      blocking() {
        void dbPromise?.then((open) => open.close()).catch(() => undefined);
        dbPromise = null;
      },
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const files = db.createObjectStore(FILES_STORE, { keyPath: "id" });
          files.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const history = db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
          history.createIndex("createdAt", "createdAt");
        }
        // oldVersion 0→1 files only; 1→2 adds history; 3→4 drops the removed
        // queue store — its rows are never read again, so drop the blobs.
        if (db.objectStoreNames.contains("queue")) db.deleteObjectStore("queue");
        void oldVersion;
      },
    });
  }
  return dbPromise;
}

function isClosedConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name ?? "";
  if (name === "InvalidStateError" || name === "TransactionInactiveError") {
    return true;
  }
  const message =
    "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
  return /closed database|database is closing|connection is closing|transaction is inactive/i.test(
    message,
  );
}

/**
 * Run an operation on the pooled connection, reopening and retrying once if the
 * connection was closed under us — another tab upgrading the schema can close
 * it between `getDB()` and the first transaction.
 */
async function withDb<T>(
  fallback: T,
  op: (db: IDBPDatabase) => Promise<T>,
): Promise<T> {
  const db = await getDB();
  if (!db) return fallback;
  try {
    return await op(db);
  } catch (err) {
    if (!isClosedConnectionError(err)) throw err;
    dbPromise = null;
    const reopened = await getDB();
    if (!reopened) return fallback;
    return await op(reopened);
  }
}

async function pruneHistory(db: IDBPDatabase) {
  const keys = await db.getAllKeysFromIndex(HISTORY_STORE, "createdAt");
  if (keys.length <= MAX_HISTORY_ENTRIES) return;
  const toDelete = keys.slice(0, keys.length - MAX_HISTORY_ENTRIES);
  for (const key of toDelete) {
    await db.delete(HISTORY_STORE, key);
    await db.delete(FILES_STORE, key).catch(() => undefined);
  }
}

/**
 * Save a conversion result into the user's local database.
 * Metadata + blob stay on-device; user can delete later.
 */
export async function saveLocalConversion(
  entry: Omit<LocalHistoryEntry, "hasFile" | "createdAt"> & {
    createdAt?: string;
    data?: Blob;
  },
): Promise<void> {
  // Durable history is account-bound only.
  if (!entry.accountKey) return;

  const createdAt = entry.createdAt ?? new Date().toISOString();
  const hasFile = Boolean(entry.data && entry.data.size > 0);

  const record: LocalHistoryEntry = {
    id: entry.id,
    fileName: entry.fileName,
    originalExt: entry.originalExt,
    targetExt: entry.targetExt,
    category: entry.category,
    inputSize: entry.inputSize,
    outputSize: entry.outputSize,
    status: entry.status,
    duration: entry.duration ?? null,
    error: entry.error ?? null,
    createdAt,
    mimeType: entry.mimeType,
    hasFile,
    accountKey: entry.accountKey,
    ...(hasFile && entry.data ? { data: entry.data } : {}),
  };

  await withDb(undefined, async (db) => {
    await db.put(HISTORY_STORE, record);

    // Keep legacy files store in sync for older download helpers
    if (hasFile && entry.data) {
      await db.put(FILES_STORE, {
        id: entry.id,
        fileName: entry.fileName,
        data: entry.data,
        mimeType: entry.mimeType || entry.data.type || "application/octet-stream",
        createdAt: Date.parse(createdAt) || Date.now(),
      } satisfies StoredFileV1);
    }

    await pruneHistory(db);
  });
}

/** @deprecated Prefer saveLocalConversion */
export async function saveFileLocally(
  id: string,
  fileName: string,
  data: Blob,
  mimeType: string,
) {
  await saveLocalConversion({
    id,
    fileName,
    originalExt: "",
    targetExt: "",
    category: "other",
    inputSize: 0,
    outputSize: data.size,
    status: "done",
    duration: null,
    error: null,
    mimeType,
    data,
  });
}

export async function getLocalHistory(
  limit = 100,
  accountKey?: string | null,
): Promise<LocalHistoryEntry[]> {
  // Unauthenticated users have no durable history on this device.
  if (!accountKey) return [];

  const all = (await withDb<unknown[]>([], (db) =>
    db.getAllFromIndex(HISTORY_STORE, "createdAt"),
  )) as LocalHistoryEntry[];

  // Index returns ascending; newest last
  const list = [...all]
    .reverse()
    .filter((e) => matchesAccountKey(e.accountKey, accountKey));
  return list.slice(0, limit).map((e) => ({
    ...e,
    hasFile: Boolean(e.hasFile && e.data),
  }));
}

export async function getLocalHistoryEntry(
  id: string,
  accountKey?: string | null,
): Promise<LocalHistoryEntry | null> {
  if (!accountKey) return null;
  const entry = await withDb<LocalHistoryEntry | undefined>(
    undefined,
    (db) => db.get(HISTORY_STORE, id),
  );
  if (!entry) return null;
  if (!matchesAccountKey(entry.accountKey, accountKey)) {
    return null;
  }
  return {
    ...entry,
    hasFile: Boolean(entry.hasFile && entry.data),
  };
}

export async function getFileLocally(
  id: string,
  accountKey?: string | null,
): Promise<{ id: string; fileName: string; data: Blob; mimeType: string; createdAt: number } | null> {
  const entry = await getLocalHistoryEntry(id, accountKey);
  if (!entry?.data) return null;
  return {
    id: entry.id,
    fileName: entry.fileName,
    data: entry.data,
    mimeType: entry.mimeType || entry.data.type || "application/octet-stream",
    createdAt: Date.parse(entry.createdAt) || Date.now(),
  };
}

/** Remove only the file blob — keep history row so user can see past conversions. */
export async function deleteFileOnlyLocally(
  id: string,
  accountKey?: string | null,
): Promise<void> {
  if (!accountKey) return;
  await withDb(undefined, async (db) => {
    const entry = (await db.get(HISTORY_STORE, id)) as
      | LocalHistoryEntry
      | undefined;
    if (!entry || !matchesAccountKey(entry.accountKey, accountKey)) return;
    const { data: _drop, ...rest } = entry;
    await db.put(HISTORY_STORE, { ...rest, hasFile: false, data: undefined });
    await db.delete(FILES_STORE, id);
  });
}

/** Remove history row + file completely. */
export async function deleteLocalConversion(
  id: string,
  accountKey?: string | null,
): Promise<void> {
  if (!accountKey) return;
  await withDb(undefined, async (db) => {
    const entry = (await db.get(HISTORY_STORE, id)) as
      | LocalHistoryEntry
      | undefined;
    if (!entry || !matchesAccountKey(entry.accountKey, accountKey)) return;
    await db.delete(HISTORY_STORE, id);
    await db.delete(FILES_STORE, id);
  });
}

export async function deleteFileLocally(id: string) {
  await deleteLocalConversion(id);
}

export async function clearAllFilesLocally() {
  await withDb(undefined, async (db) => {
    await db.clear(HISTORY_STORE);
    await db.clear(FILES_STORE);
  });
}





export async function getAllStoredFiles(): Promise<
  { id: string; fileName: string; data: Blob; mimeType: string; createdAt: number }[]
> {
  const history = await getLocalHistory(MAX_HISTORY_ENTRIES);
  return history
    .filter((e) => e.data)
    .map((e) => ({
      id: e.id,
      fileName: e.fileName,
      data: e.data!,
      mimeType: e.mimeType || e.data!.type || "application/octet-stream",
      createdAt: Date.parse(e.createdAt) || Date.now(),
    }));
}

export async function getLocalStats(accountKey?: string | null): Promise<{
  total: number;
  done: number;
  errors: number;
  totalInputSize: number;
  totalOutputSize: number;
  withFiles: number;
}> {
  const list = await getLocalHistory(MAX_HISTORY_ENTRIES, accountKey);
  return {
    total: list.length,
    done: list.filter((e) => e.status === "done").length,
    errors: list.filter((e) => e.status === "error").length,
    totalInputSize: list.reduce((a, e) => a + (e.inputSize || 0), 0),
    totalOutputSize: list.reduce((a, e) => a + (e.outputSize || 0), 0),
    withFiles: list.filter((e) => e.hasFile).length,
  };
}
