import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageIntro({
  title,
  description,
  icons,
  children,
  compactWhenQueued = false,
}: {
  title: string;
  description: ReactNode;
  icons?: ReactNode;
  children?: ReactNode;
  compactWhenQueued?: boolean;
}) {
  return (
    <header className={cn("mx-auto mb-6 w-full max-w-3xl px-1 text-center after:hidden sm:mb-8", compactWhenQueued && "group-has-[[data-slot=conversion-queue]]/converter:mb-4")}>
      {icons && (
        <div aria-hidden="true" className={cn("mb-4 flex items-center justify-center gap-2.5 sm:mb-5", compactWhenQueued && "group-has-[[data-slot=conversion-queue]]/converter:hidden")}>
          {icons}
        </div>
      )}
      <h1 className={cn("text-balance text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white", compactWhenQueued && "group-has-[[data-slot=conversion-queue]]/converter:text-2xl")}>
        {title}
      </h1>
      <div className={cn("mt-2.5 text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base", compactWhenQueued && "group-has-[[data-slot=conversion-queue]]/converter:hidden")}>
        {description}
      </div>
      {children}
    </header>
  );
}
