"use client";

import type { CmsAd } from "@/hooks/use-cms";

/** Renders enabled CMS ads for a placement. Admin HTML/code is trusted. */
export function CmsAdSlot({
  ads,
  className = "",
}: {
  ads: CmsAd[];
  className?: string;
}) {
  if (!ads.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {ads.map((ad) => {
        if (ad.type === "code" && ad.code) {
          return (
            <div
              key={ad.id}
              className="cms-ad overflow-hidden"
              dangerouslySetInnerHTML={{ __html: ad.code }}
            />
          );
        }
        if (ad.type === "google" && ad.code) {
          return (
            <div
              key={ad.id}
              className="cms-ad overflow-hidden flex justify-center"
              dangerouslySetInnerHTML={{ __html: ad.code }}
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
              <div dangerouslySetInnerHTML={{ __html: ad.content }} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
