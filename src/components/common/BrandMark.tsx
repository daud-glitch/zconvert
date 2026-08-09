/**
 * Convertek official 3D glass mark — transparent PNG (public/logo-mark.png).
 */
const LOGO_SRC = "/logo-mark.png?v=3";

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
      src={LOGO_SRC}
      alt="Convertek"
      width={40}
      height={40}
      className={`${className} ${rounded} shrink-0 object-contain bg-transparent`}
      decoding="async"
    />
  );
}
