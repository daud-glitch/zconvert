import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 w-full bg-emerald-500" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Converter
        </Link>
        <article>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {updated}
          </p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-emerald-600 [&_a]:underline-offset-2 hover:[&_a]:underline">
            {children}
          </div>
          <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
            Convertek ·{" "}
            <a href="https://www.convertek.tech">www.convertek.tech</a>
          </p>
        </article>
      </div>
    </div>
  );
}
