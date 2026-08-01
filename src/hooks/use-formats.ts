"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type FormatsData } from "@/lib/app-types";
import { readJsonResponse } from "@/lib/http-json";

export const FORMATS_CHANNEL = "zconvert-formats";
const POLL_MS = 8_000;

export type FormatsInvalidateMessage = {
  type: "invalidate";
  version?: string;
};

/** Notify other tabs/views that the formats catalog changed. */
export function notifyFormatsChanged(version?: string) {
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
 * Live formats catalog: loads `/api/formats`, polls for version changes,
 * and reacts to same-browser admin updates via BroadcastChannel.
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
  }, []);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await fetch("/api/formats", { cache: "no-store" });
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

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  // Poll for version changes (admin ↔ public sync)
  useEffect(() => {
    if (!enabled || pollMs <= 0) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const res = await fetch("/api/formats", { cache: "no-store" });
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
      void load({ silent: true });
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
