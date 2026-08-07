/**
 * Convertek brand mark — HD dual-file convert symbol (public/logo-mark.png, transparent).
 */
export function BrandMark({
  className = "h-8 w-8 sm:h-10 sm:w-10",
  rounded = "rounded-xl",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public brand PNG
    <img
      src="/logo-mark.png"
      alt="Convertek"
      width={40}
      height={40}
      className={`${className} ${rounded} shrink-0 object-contain bg-transparent`}
      decoding="async"
    />
  );
}
