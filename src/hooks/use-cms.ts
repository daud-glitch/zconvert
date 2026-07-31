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

export function useCmsBundle() {
  const [data, setData] = useState<CmsBundle>(emptyBundle);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cms")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setData({
          features: Array.isArray(json.features) ? json.features : [],
          links: Array.isArray(json.links) ? json.links : [],
          ads: Array.isArray(json.ads) ? json.ads : [],
        });
      })
      .catch(() => {
        if (!cancelled) setData(emptyBundle);
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
