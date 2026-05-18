"use client";

import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "zconvert-storage";
const STORE_NAME = "files";
const DB_VERSION = 1;

interface StoredFile {
  id: string; // conversionId
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
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveFileLocally(id: string, fileName: string, data: Blob, mimeType: string) {
  const db = await getDB();
  if (!db) return;

  const entry: StoredFile = {
    id,
    fileName,
    data,
    mimeType,
    createdAt: Date.now(),
  };

  await db.put(STORE_NAME, entry);

  // Optional: Clean up old files (keep last 100)
  const allKeys = await db.getAllKeysFromIndex(STORE_NAME, "createdAt");
  if (allKeys.length > 100) {
    const keysToDelete = allKeys.slice(0, allKeys.length - 100);
    for (const key of keysToDelete) {
      await db.delete(STORE_NAME, key);
    }
  }
}

export async function getFileLocally(id: string): Promise<StoredFile | null> {
  const db = await getDB();
  if (!db) return null;
  return db.get(STORE_NAME, id);
}

export async function deleteFileLocally(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete(STORE_NAME, id);
}

export async function clearAllFilesLocally() {
  const db = await getDB();
  if (!db) return;
  await db.clear(STORE_NAME);
}

export async function getAllStoredFiles(): Promise<StoredFile[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex(STORE_NAME, "createdAt");
}
