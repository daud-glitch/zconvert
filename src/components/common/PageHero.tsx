import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { FileIllustration } from "@/components/common/FileIllustration";
import { cn } from "@/lib/utils";

export type PageHeroBreadcrumb = { href: string; label: string };

/**
 * Shared page hero for content pages: optional breadcrumb row plus the
 * rounded emerald hero block (eyebrow, illustration, title, lead) used by
 * the unified Convertek page design.
 */
export function PageHero({
  title,
  lead,
  eyebrow,
  eyebrowIcon,
  illustration,
  breadcrumb,
  className,
  children,
}: {
  title: string;
  lead?: ReactNode;
  eyebrow?: string;
  eyebrowIcon?: ReactNode;
  illustration?: { type?: string; extension?: string };
  breadcrumb?: PageHeroBreadcrumb[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <>
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <span
                key={`${crumb.href}-${index}`}
                className="flex items-center gap-1.5"
              >
                {index > 0 && (
                  <ChevronRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                )}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      ) : null}
      <div
        className={cn(
          "mb-10 rounded-3xl bg-emerald-50/70 p-5 sm:p-8 dark:bg-emerald-950/30",
          className,
        )}
      >
        {illustration ? (
          <div className="mb-4">
            <FileIllustration
              type={illustration.type}
              extension={illustration.extension}
              className="h-16 w-13"
            />
          </div>
        ) : null}
        {eyebrow ? (
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {eyebrowIcon}
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
          {title}
        </h1>
        {lead ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {lead}
          </p>
        ) : null}
        {children}
      </div>
    </>
  );
}
