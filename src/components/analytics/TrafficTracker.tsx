"use client";

import { useEffect, useState } from "react";
import { isLikelyCrawler } from "@/lib/crawler";
import { useApp } from "@/lib/app-context";
import { hasAnalyticsConsent, subscribeConsent } from "@/lib/consent";

/**
 * Lightweight first-party page-view beacon for admin traffic sources.
 * One beacon per path per browser session (privacy-friendly, no third party).
 *
 * Skipped when analytics consent is withheld; if the visitor accepts later on
 * the same page, the consent change re-runs this effect and the beacon fires.
 */
export function TrafficTracker() {
  const { isAdmin, loading } = useApp();
  const [consentVersion, setConsentVersion] = useState(0);

  useEffect(() => subscribeConsent(() => setConsentVersion((v) => v + 1)), []);

  useEffect(() => {
    if (loading || isAdmin) return;

    try {
      if (isLikelyCrawler()) return;
      if (!hasAnalyticsConsent()) return;

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
  }, [loading, isAdmin, consentVersion]);

  return null;
}
