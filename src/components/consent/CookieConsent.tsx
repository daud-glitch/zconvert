"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CONSENT_OPEN_EVENT,
  needsConsentPrompt,
  openCookieSettings,
  readConsent,
  saveConsent,
} from "@/lib/consent";

/**
 * Cookie / ad consent notice.
 *
 * Opens by itself only for EEA, UK and Swiss visitors (opt-in). Everyone else
 * can still reach it through the footer's "Cookie settings" button, which is
 * also how a consent decision is withdrawn later.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [ads, setAds] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  const openBanner = useCallback((withPrefs = false) => {
    const decision = readConsent();
    setAds(decision ? decision.ads : true);
    setAnalytics(decision ? decision.analytics : true);
    setShowPrefs(withPrefs);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (needsConsentPrompt()) openBanner();

    const onRequested = () => openBanner(true);
    window.addEventListener(CONSENT_OPEN_EVENT, onRequested);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onRequested);
  }, [openBanner]);

  const decide = (choice: { ads: boolean; analytics: boolean }) => {
    saveConsent(choice);
    setOpen(false);
    setShowPrefs(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur sm:p-5">
        <h2
          id="cookie-consent-title"
          className="text-sm font-semibold text-foreground sm:text-base"
        >
          Cookies and ads
        </h2>
        <p
          id="cookie-consent-description"
          className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm"
        >
          Essential storage keeps the converter working and remembers your
          settings. With your permission we also use first-party analytics and
          Google AdSense cookies, which keep the service free. See our{" "}
          <Link href="/privacy" className="text-emerald-600 hover:underline">
            Privacy Policy
          </Link>{" "}
          for details and opt-out links.
        </p>

        {showPrefs && (
          <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={ads}
                onChange={(event) => setAds(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-emerald-600"
              />
              <span>
                <span className="font-medium text-foreground">Advertising</span>
                <span className="block text-muted-foreground">
                  Google AdSense cookies, used to show and measure ads. If you
                  turn this off you may still see non-personalised ads.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-emerald-600"
              />
              <span>
                <span className="font-medium text-foreground">Analytics</span>
                <span className="block text-muted-foreground">
                  First-party page-view counts only. No third-party tracking.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => decide({ ads: true, analytics: true })}>
            Accept all
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => decide({ ads: false, analytics: false })}
          >
            Reject optional
          </Button>
          {showPrefs ? (
            <Button size="sm" variant="ghost" onClick={() => decide({ ads, analytics })}>
              Save choices
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPrefs(true)}
              className="text-muted-foreground"
            >
              Manage preferences
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Footer control that re-opens the consent banner to change or withdraw. */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className={`transition-colors hover:text-foreground ${className}`}
    >
      Cookie settings
    </button>
  );
}
