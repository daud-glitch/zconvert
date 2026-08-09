/**
 * Brand wordmark: Convertek with red ".tech" subscript.
 */
export function BrandTitle({
  className = "text-base sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400",
  subClassName = "text-red-600 dark:text-red-400 font-extrabold ml-0.5",
}: {
  className?: string;
  subClassName?: string;
}) {
  return (
    <span className={`${className} whitespace-nowrap`}>
      Convertek
      <sub
        className={`${subClassName} text-[0.55em] relative bottom-[-0.05em] leading-none tracking-tight`}
      >
        .tech
      </sub>
    </span>
  );
}

/** Primary + secondary product lines under the wordmark. */
export function BrandTaglines({
  className = "",
  primaryClassName = "text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-70",
  secondaryClassName = "text-[9px] text-muted-foreground/80 font-medium tracking-wide",
}: {
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}) {
  return (
    <div className={className}>
      <p className={primaryClassName}>Any file · Any format</p>
      <p className={`${secondaryClassName} mt-0.5`}>
        Drop it. Convert it. Download it.
      </p>
    </div>
  );
}
