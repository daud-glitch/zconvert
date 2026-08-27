"use client";

import type { CmsAd } from "@/hooks/use-cms";
import { sanitizeHtml } from "@/lib/sanitize-html";

/** Renders enabled CMS ads for a placement (HTML sanitized). */
export function CmsAdSlot({
  ads,
  className = "",
}: {
  ads: CmsAd[];
  className?: string;
}) {
  const visible = ads.filter((ad) => ad.type === "banner" || ad.type === "code");
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
