"use client";

import { openDB, IDBPDatabase } from "idb";
import { type FileItem } from "@/lib/app-types";

const DB_NAME = "zconvert-storage";
const FILES_STORE = "files";
const HISTORY_STORE = "history";
const QUEUE_STORE = "queue";
const DB_VERSION = 3;
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

/** Account key used for rows queued while signed out. */
export const QUEUE_ACCOUNT_GUEST = "guest";

/**
 * One persisted conversion-queue row. The input file itself is kept on-device so a
 * reload restores the queue; `uploadId` lets Convert reuse the server staging
 * session instead of re-uploading.
 *
 * ponytail: a conversion that was mid-flight at reload is unknowable — its HTTP
 * response died with the page. Those rows come back as `pending` and re-convert
 * on the next explicit click. Add server job polling if resuming encodes matters.
 */
export interface StoredQueueItem {
  id: string;
  /**
   * Owner of this row: the signed-in account id, or `guest` when signed out.
   * Rows are device-local, so without this a second account on a shared device
   * would restore the first account's queue (and vice versa).
   */
  accountKey: string;
  name: string;
  ext: string;
  size: number;
  targetFormat: string;
  quality: number;
  resizeWidth: number | null;
  resizeHeight: number | null;
  status: FileItem["status"];
  error?: string;
  outputSize?: number;
  uploadId?: string;
  file: Blob;
  /** Converted output, so a finished row keeps its download after a reload. */
  result?: Blob;
  /** Queue position — restored in this order. */
  order: number;
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
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queue = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
          queue.createIndex("order", "order");
        }
        // oldVersion 0→1 files only; 1→2 adds history; 2→3 adds the queue
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
  // Durable history is account-bound only.
  if (!entry.accountKey) return;

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
    accountKey: entry.accountKey,
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
  // Unauthenticated users have no durable history on this device.
  if (!accountKey) return [];

  const db = await getDB();
  if (!db) return [];

  const all = (await db.getAllFromIndex(
    HISTORY_STORE,
    "createdAt",
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
  const db = await getDB();
  if (!db) return null;
  const entry = (await db.get(HISTORY_STORE, id)) as
    | LocalHistoryEntry
    | undefined;
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
  const db = await getDB();
  if (!db) return;
  const entry = (await db.get(HISTORY_STORE, id)) as
    | LocalHistoryEntry
    | undefined;
  if (!entry || !matchesAccountKey(entry.accountKey, accountKey)) return;
  const { data: _drop, ...rest } = entry;
  await db.put(HISTORY_STORE, { ...rest, hasFile: false, data: undefined });
  await db.delete(FILES_STORE, id);
}

/** Remove history row + file completely. */
export async function deleteLocalConversion(
  id: string,
  accountKey?: string | null,
): Promise<void> {
  if (!accountKey) return;
  const db = await getDB();
  if (!db) return;
  const entry = (await db.get(HISTORY_STORE, id)) as
    | LocalHistoryEntry
    | undefined;
  if (!entry || !matchesAccountKey(entry.accountKey, accountKey)) return;
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

/**
 * Replace the persisted queue for the rows' own account only. Other accounts'
 * rows on the same device are left untouched.
 */
export async function saveConversionQueue(
  items: StoredQueueItem[],
): Promise<void> {
  // A blocked upgrade, quota, or private-mode failure must never break a conversion.
  try {
    const db = await getDB();
    if (!db) return;
    const accountKey = items[0]?.accountKey;
    if (!accountKey) return;
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const existing = (await tx.store.getAll()) as StoredQueueItem[];
    const keep = new Set(items.map((i) => i.id));
    for (const row of existing) {
      if (row.accountKey === accountKey && !keep.has(row.id)) {
        await tx.store.delete(row.id);
      }
    }
    for (const item of items) await tx.store.put(item);
    await tx.done;
  } catch {
    /* queue persistence is best-effort */
  }
}

/** Rows from the last session for this account, in queue order. */
/**
 * The rows this account may see, in queue order. Storage is device-local and
 * shared by every account using the browser, so this filter is the whole
 * isolation rule: a guest or a different account must never inherit rows.
 */
export function queueRowsForAccount(
  rows: StoredQueueItem[],
  accountKey: string,
): StoredQueueItem[] {
  return rows
    .filter(
      (r) =>
        r?.accountKey === accountKey &&
        r.file instanceof Blob &&
        r.file.size > 0,
    )
    .sort((a, b) => a.order - b.order);
}

export async function getConversionQueue(
  accountKey: string,
): Promise<StoredQueueItem[]> {
  try {
    const db = await getDB();
    if (!db) return [];
    const rows = (await db.getAllFromIndex(
      QUEUE_STORE,
      "order",
    )) as StoredQueueItem[];
    return queueRowsForAccount(rows, accountKey);
  } catch {
    return [];
  }
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
