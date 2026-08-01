"use client";

import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "zconvert-storage";
const FILES_STORE = "files";
const HISTORY_STORE = "history";
const DB_VERSION = 2;
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

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const files = db.createObjectStore(FILES_STORE, { keyPath: "id" });
          files.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const history = db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
          history.createIndex("createdAt", "createdAt");
        }
        // oldVersion 0→1 created files only; 1→2 adds history
        void oldVersion;
      },
    });
  }
  return dbPromise;
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
  const db = await getDB();
  if (!db) return;

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
    accountKey: entry.accountKey ?? null,
    ...(hasFile && entry.data ? { data: entry.data } : {}),
  };

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
  const db = await getDB();
  if (!db) return [];

  const all = (await db.getAllFromIndex(
    HISTORY_STORE,
    "createdAt",
  )) as LocalHistoryEntry[];

  // Index returns ascending; newest last
  let list = [...all].reverse();
  if (accountKey) {
    list = list.filter(
      (e) => !e.accountKey || e.accountKey === accountKey,
    );
  }
  return list.slice(0, limit).map((e) => ({
    ...e,
    hasFile: Boolean(e.hasFile && e.data),
  }));
}

export async function getLocalHistoryEntry(
  id: string,
): Promise<LocalHistoryEntry | null> {
  const db = await getDB();
  if (!db) return null;
  const entry = (await db.get(HISTORY_STORE, id)) as
    | LocalHistoryEntry
    | undefined;
  if (!entry) {
    // Fallback: legacy files-only row
    const file = (await db.get(FILES_STORE, id)) as StoredFileV1 | undefined;
    if (!file) return null;
    return {
      id: file.id,
      fileName: file.fileName,
      originalExt: "",
      targetExt: "",
      category: "other",
      inputSize: 0,
      outputSize: file.data.size,
      status: "done",
      duration: null,
      error: null,
      createdAt: new Date(file.createdAt).toISOString(),
      mimeType: file.mimeType,
      data: file.data,
      hasFile: true,
    };
  }
  return {
    ...entry,
    hasFile: Boolean(entry.hasFile && entry.data),
  };
}

export async function getFileLocally(
  id: string,
): Promise<{ id: string; fileName: string; data: Blob; mimeType: string; createdAt: number } | null> {
  const entry = await getLocalHistoryEntry(id);
  if (entry?.data) {
    return {
      id: entry.id,
      fileName: entry.fileName,
      data: entry.data,
      mimeType: entry.mimeType || entry.data.type || "application/octet-stream",
      createdAt: Date.parse(entry.createdAt) || Date.now(),
    };
  }
  const db = await getDB();
  if (!db) return null;
  return (await db.get(FILES_STORE, id)) ?? null;
}

/** Remove only the file blob — keep history row so user can see past conversions. */
export async function deleteFileOnlyLocally(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const entry = (await db.get(HISTORY_STORE, id)) as
    | LocalHistoryEntry
    | undefined;
  if (entry) {
    const { data: _drop, ...rest } = entry;
    await db.put(HISTORY_STORE, { ...rest, hasFile: false, data: undefined });
  }
  await db.delete(FILES_STORE, id);
}

/** Remove history row + file completely. */
export async function deleteLocalConversion(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete(HISTORY_STORE, id);
  await db.delete(FILES_STORE, id);
}

export async function deleteFileLocally(id: string) {
  await deleteLocalConversion(id);
}

export async function clearAllFilesLocally() {
  const db = await getDB();
  if (!db) return;
  await db.clear(HISTORY_STORE);
  await db.clear(FILES_STORE);
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
