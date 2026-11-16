import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { FileIconTile } from "@/components/common/FileIconTile";

/** Metadata for a guide card. Article bodies stay on the server. */
export type GuideTeaser = {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  format?: { extension: string; category: string };
};

export function HomeGuidesSection({ guides }: { guides: GuideTeaser[] }) {
  if (guides.length === 0) return null;

  return (
    <section id="guides" aria-labelledby="guides-heading" className="px-3 pb-10 sm:px-6 sm:pb-14 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-emerald-100 bg-[#f3faf6] p-4 sm:rounded-3xl sm:p-7 dark:border-emerald-900/65 dark:bg-emerald-950/25">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          <div className="max-w-xl">
            <h2 id="guides-heading" className="text-xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              File conversion guides
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Compare formats and choose settings that preserve what matters for your files.
            </p>
          </div>
          <Link href="/guides" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
            All guides <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <ul className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map(({ slug, title, description, readingMinutes, format }) => (
            <li key={slug} className="min-w-0">
              <Link href={`/guides/${slug}`} className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-emerald-300 dark:hover:border-emerald-700">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <FileIconTile type={format?.category} extension={format?.extension} />
                  <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3" /> {readingMinutes} min
                  </span>
                </div>
                <h3 className="text-sm font-bold leading-snug text-slate-950 group-hover:text-emerald-800 dark:text-white dark:group-hover:text-emerald-300">{title}</h3>
                <p className="mt-2 mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
                <span className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Read guide <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
