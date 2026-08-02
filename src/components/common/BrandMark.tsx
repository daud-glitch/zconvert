/**
 * Brand mark (matches public/favicon.svg) for nav headers.
 */
export function BrandMark({
  className = "h-8 w-8 sm:h-10 sm:w-10",
  rounded = "rounded-xl",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public SVG brand asset
    <img
      src="/favicon.svg"
      alt=""
      width={40}
      height={40}
      className={`${className} ${rounded} shadow-lg shadow-emerald-500/20 shrink-0 object-cover`}
      decoding="async"
    />
  );
}
