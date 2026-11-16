import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { PageHero } from "@/components/common/PageHero";
import { SiteFooter } from "@/components/common/SiteFooter";
import { SiteHeader } from "@/components/common/SiteHeader";

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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHero
          breadcrumb={[
            { href: "/", label: "Home" },
            { href: "#", label: title },
          ]}
          eyebrow="Legal"
          eyebrowIcon={<ShieldCheck className="h-4 w-4" aria-hidden />}
          title={title}
        >
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {updated}
          </p>
        </PageHero>
        <article>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-emerald-600 [&_a]:underline-offset-2 hover:[&_a]:underline dark:[&_a]:text-emerald-400">
            {children}
          </div>
          <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
            Convertek ·{" "}
            <a href="https://www.convertek.tech">www.convertek.tech</a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
