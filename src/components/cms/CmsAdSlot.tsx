"use client";

import { useEffect, useState } from "react";
import type { CmsAd } from "@/hooks/use-cms";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { hasAdsConsent, subscribeConsent } from "@/lib/consent";

/**
 * Renders enabled CMS ads for a placement (HTML sanitized).
 *
 * `code` ads are third-party ad tags (AdSense units included), so they wait for
 * an advertising consent decision — nothing is injected before it is known.
 */
export function CmsAdSlot({
  ads,
  className = "",
}: {
  ads: CmsAd[];
  className?: string;
}) {
  const [adsAllowed, setAdsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setAdsAllowed(hasAdsConsent());
    return subscribeConsent(() => setAdsAllowed(hasAdsConsent()));
  }, []);

  const visible = ads
    .filter((ad) => ad.type === "banner" || ad.type === "code")
    .filter((ad) => ad.type !== "code" || adsAllowed === true);
  if (!visible.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {visible.map((ad) => {
        if (ad.type === "code" && ad.code) {
          return (
            <div
              key={ad.id}
              className="cms-ad overflow-hidden"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(ad.code) }}
            />
          );
        }
        if (ad.content) {
          return (
            <div
              key={ad.id}
              className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
            >
              {ad.title ? (
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  {ad.title}
                </div>
              ) : null}
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(ad.content),
                }}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
