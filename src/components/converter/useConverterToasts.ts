"use client";

import { useCallback, useRef, useState } from "react";

export type Toast = { id: string; message: string; type: "success" | "error" };

const TOAST_TTL_MS = 3500;

/**
 * Transient toast queue used by the converter for every user-facing outcome.
 *
 * Timers are tracked so a toast that is dismissed early cannot later fire a
 * stale removal against reused state.
 */
export function useConverterToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
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