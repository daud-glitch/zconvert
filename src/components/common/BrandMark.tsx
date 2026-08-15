/**
 * Convertek brand mark — optimized WebP + PNG fallback (public/logo-mark.*).
 * Display size is small (≤56px); assets are ~160px for retina, not full 1K masters.
 */
import { BRAND_ASSET_VERSION } from "@/lib/seo";

const LOGO_WEBP = `/logo-mark.webp?v=${BRAND_ASSET_VERSION}`;
const LOGO_PNG = `/logo-mark-fallback.png?v=${BRAND_ASSET_VERSION}`;

export function BrandMark({
  className = "h-8 w-8 sm:h-10 sm:w-10",
  rounded = "rounded-xl",
  priority = false,
}: {
  className?: string;
  rounded?: string;
  /** Set true for above-the-fold header marks */
  priority?: boolean;
}) {
  return (
    <picture>
      <source srcSet={LOGO_WEBP} type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static public brand mark */}
      <img
        src={LOGO_PNG}
        alt="Convertek"
        width={40}
        height={40}
        className={`${className} ${rounded} shrink-0 object-contain bg-transparent`}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
      />
    </picture>
  );
}
