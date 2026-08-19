"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type FormatsData } from "@/lib/app-types";
import { readJsonResponse } from "@/lib/http-json";

export const FORMATS_CHANNEL = "zconvert-formats";
/** Poll for admin updates less often — saves bandwidth under traffic. */
const POLL_MS = 60_000;
const STORAGE_KEY = "zconvert-formats-cache-v1";
const STORAGE_TTL_MS = 10 * 60_000; // 10 min soft cache

export type FormatsInvalidateMessage = {
  type: "invalidate";
  version?: string;
};

type StoredFormats = {
  savedAt: number;
  data: FormatsData;
};

function readStoredFormats(): FormatsData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFormats;
    if (!parsed?.data?.grouped) return null;
    if (Date.now() - parsed.savedAt > STORAGE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeStoredFormats(data: FormatsData) {
  try {
    const payload: StoredFormats = { savedAt: Date.now(), data };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

/** Notify other tabs/views that the formats catalog changed. */
export function notifyFormatsChanged(version?: string) {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    const bc = new BroadcastChannel(FORMATS_CHANNEL);
    const msg: FormatsInvalidateMessage = { type: "invalidate", version };
    bc.postMessage(msg);
    bc.close();
  } catch {
    // BroadcastChannel unsupported — polling still covers sync
  }
  try {
    window.dispatchEvent(
      new CustomEvent(FORMATS_CHANNEL, { detail: { version } }),
    );
  } catch {
    /* ignore */
  }
}

/**
 * Formats catalog: session cache + intermittent poll (not every few seconds).
 */
export function useFormats(options: { pollMs?: number; enabled?: boolean } = {}) {
  const { pollMs = POLL_MS, enabled = true } = options;
  const [data, setData] = useState<FormatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef<string | undefined>(undefined);

  const applyData = useCallback((next: FormatsData) => {
    versionRef.current = next.version;
    setData(next);
    setError(null);
    writeStoredFormats(next);
  }, []);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await fetch("/api/formats");
        const json = await readJsonResponse<FormatsData & { error?: string }>(
          res,
        );
        if (!res.ok || json.error || !json.grouped) {
          throw new Error(json.error || `Failed to load formats (${res.status})`);
        }
        applyData(json);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load formats";
        setError(message);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [applyData],
  );

  // Hydration-safe: paint from sessionStorage then refresh
  useEffect(() => {
    if (!enabled) return;
    const cached = readStoredFormats();
    if (cached) {
      versionRef.current = cached.version;
      setData(cached);
      setLoading(false);
      // Always background-refresh to ensure stale cache (like disabled formats) is updated
      void load({ silent: true });
    } else {
      void load();
    }
  }, [enabled, load]);

  // Slow poll for version changes (admin ↔ public)
  useEffect(() => {
    if (!enabled || pollMs <= 0) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const res = await fetch("/api/formats");
          const json = await readJsonResponse<FormatsData & { error?: string }>(
            res,
          );
          if (!res.ok || json.error || !json.grouped) return;
          if (json.version && json.version !== versionRef.current) {
            applyData(json);
          }
        } catch {
          /* keep last good data */
        }
      })();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [enabled, pollMs, applyData]);

  // Same-browser realtime invalidate
  useEffect(() => {
    if (!enabled) return;

    const onMessage = () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      void load({ silent: false }); // Force UI update on invalidation
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(FORMATS_CHANNEL);
      bc.onmessage = onMessage;
    } catch {
      bc = null;
    }

    window.addEventListener(FORMATS_CHANNEL, onMessage);
    return () => {
      bc?.close();
      window.removeEventListener(FORMATS_CHANNEL, onMessage);
    };
  }, [enabled, load]);

  return { data, loading, error, reload: load, version: data?.version };
}
