import type { ReactNode } from "react";

export function PageIntro({
  title,
  description,
  icons,
  children,
}: {
  title: string;
  description: ReactNode;
  icons?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mx-auto mb-6 max-w-3xl px-1 text-center sm:mb-8">
      {icons && (
        <div aria-hidden="true" className="mb-4 flex items-center justify-center gap-2.5 sm:mb-5">
          {icons}
        </div>
      )}
      <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
        {title}
      </h1>
      <div className="mt-2.5 text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
        {description}
      </div>
      {children}
    </header>
  );
}
