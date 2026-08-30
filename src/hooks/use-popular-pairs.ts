"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConversionPair } from "@/lib/conversion-pairs";
import { getPopularPairs } from "@/lib/conversion-pairs";
import { readJsonResponse } from "@/lib/http-json";

export type PopularPairItem = ConversionPair & {
  count: number | null;
};

const POLL_MS = 60_000;

const FALLBACK: PopularPairItem[] = getPopularPairs().map((p) => ({
  ...p,
  count: null,
}));

export function usePopularPairs() {
  const [pairs, setPairs] = useState<PopularPairItem[]>(FALLBACK);
  const [source, setSource] = useState<"live" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/popular-pairs");
      if (!res.ok) return;
      const data = await readJsonResponse<{
        pairs?: PopularPairItem[];
        source?: "live" | "fallback";
      }>(res);
      if (data.pairs?.length) {
        setPairs(data.pairs);
        setSource(data.source === "live" ? "live" : "fallback");
      }
    } catch {
      // keep previous / fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return { pairs, source, loading, refresh: load };
}
