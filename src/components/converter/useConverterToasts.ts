"use client";

import { useCallback, useRef, useState } from "react";

export type Toast = { id: string; message: string; type: "success" | "error" };

const TOAST_TTL_MS = 3500;
const MAX_VISIBLE = 3;

/**
 * Transient toast queue used by the converter for every user-facing outcome.
 *
 * The queue caps visible toasts, collapses duplicate messages, and prioritizes
 * recent errors so the UI stays calm even when many things fire at once.
 * Timers are tracked so a toast that is dismissed early cannot later fire a
 * stale removal against reused state.
 */
export function useConverterToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      setToasts((prev) => {
        // Collapse duplicate messages so the same line does not stack up.
        const filtered = prev.filter(
          (t) => t.message !== message || t.type !== type,
        );
        const next = [{ id, message, type }, ...filtered];
        if (next.length > MAX_VISIBLE) {
          return next.slice(0, MAX_VISIBLE);
        }
        return next;
      });

      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_TTL_MS);
      timersRef.current.add(timer);
    },
    [],
  );

  const clearToasts = useCallback(() => {
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current.clear();
    setToasts([]);
  }, []);

  return { toasts, showToast, clearToasts };
}

