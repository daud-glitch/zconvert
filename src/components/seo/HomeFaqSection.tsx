import { HOME_FAQS } from "@/lib/faq";

/** Visible homepage FAQ — kept in sync with HomeFaqJsonLd / HOME_FAQS. */
export function HomeFaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-border/40 bg-background py-14"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2
          id="faq-heading"
          className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          Frequently asked questions
        </h2>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Quick answers about converting files on Convertek.
        </p>
        <dl className="mt-10 space-y-6">
          {HOME_FAQS.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl border border-border/60 bg-muted/20 px-5 py-4"
            >
              <dt className="text-base font-semibold text-foreground">
                {item.question}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
