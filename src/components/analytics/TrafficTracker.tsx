"use client";

import { useEffect } from "react";
import { isLikelyCrawler } from "@/lib/crawler";
import { useApp } from "@/lib/app-context";

/**
 * Lightweight first-party page-view beacon for admin traffic sources.
 * One beacon per path per browser session (privacy-friendly, no third party).
 */
export function TrafficTracker() {
  const { isAdmin, loading } = useApp();

  useEffect(() => {
    if (loading || isAdmin) return;

    try {
      if (isLikelyCrawler()) return;

      const path = window.location.pathname || "/";
      // Skip admin UI itself
      if (
        path.startsWith("/system/") ||
        path.startsWith("/core/system/") ||
        path.startsWith("/admin")
      ) {
        return;
      }

      const key = `pv:${path}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");

      const params = new URLSearchParams(window.location.search);
      const payload = {
        path,
        referrer: document.referrer || null,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
      };
      const body = JSON.stringify(payload);

      if (typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/pageview", blob);
        return;
      }

      void fetch("/api/analytics/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => undefined);
    } catch {
      // ignore tracker failures
    }
  }, [loading, isAdmin]);

  return null;
}
