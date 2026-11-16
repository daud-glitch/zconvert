import { ChevronDown, CircleHelp } from "lucide-react";
import { HOME_FAQS } from "@/lib/faq";

/** FAQ answers are rendered from the same content as the homepage JSON-LD. */
export function HomeFaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="px-3 pb-12 sm:px-6 sm:pb-16 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-5 border-t border-border/70 pt-8 sm:pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8">
        <div>
          <span aria-hidden="true" className="mb-3 grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/65 dark:text-emerald-300">
            <CircleHelp className="size-5" />
          </span>
          <h2 id="faq-heading" className="max-w-xs text-xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Frequently asked questions
          </h2>
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {HOME_FAQS.map(({ question, answer }, index) => (
            <details key={question} open={index === 0} className="group border-b border-border/70 last:border-b-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold transition-colors hover:bg-emerald-50/60 group-open:text-emerald-800 focus-visible:outline-offset-[-3px] sm:px-5 dark:hover:bg-emerald-950/25 dark:group-open:text-emerald-300 [&::-webkit-details-marker]:hidden">
                {question}
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground group-open:bg-emerald-50 group-open:text-emerald-800 dark:group-open:bg-emerald-950 dark:group-open:text-emerald-300">
                  <ChevronDown className="size-4 group-open:rotate-180" />
                </span>
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-5">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
