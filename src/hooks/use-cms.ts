"use client";

import { useEffect, useState } from "react";

export type CmsAd = {
  id: string;
  title: string;
  location: string;
  type: string;
  content: string | null;
  code: string | null;
};

export type CmsLink = {
  id: string;
  label: string;
  url: string;
  group: string;
  icon: string | null;
};

export type CmsFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type CmsBundle = {
  features: CmsFeature[];
  links: CmsLink[];
  ads: CmsAd[];
};

const emptyBundle: CmsBundle = { features: [], links: [], ads: [] };
const STORAGE_KEY = "zconvert-cms-bundle-v1";
const STORAGE_TTL_MS = 10 * 60_000;

function readStored(): CmsBundle | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: CmsBundle };
    if (Date.now() - parsed.savedAt > STORAGE_TTL_MS) return null;
    if (!Array.isArray(parsed.data?.features)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeStored(data: CmsBundle) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    /* ignore */
  }
}

export function useCmsBundle() {
  const [data, setData] = useState<CmsBundle>(emptyBundle);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cached = readStored();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    fetch("/api/cms")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const next: CmsBundle = {
          features: Array.isArray(json.features) ? json.features : [],
          links: Array.isArray(json.links) ? json.links : [],
          ads: Array.isArray(json.ads) ? json.ads : [],
        };
        setData(next);
        writeStored(next);
      })
      .catch(() => {
        if (!cancelled && !cached) setData(emptyBundle);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...data, loading };
}

export function linksByGroup(links: CmsLink[], group: string): CmsLink[] {
  return links.filter((l) => l.group === group);
}

export function adsByLocation(ads: CmsAd[], location: string): CmsAd[] {
  return ads.filter((a) => a.location === location);
}
