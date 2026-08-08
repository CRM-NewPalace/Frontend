import type { ReactNode } from "react";
import { MarketingFooter } from "@/marketing/components/MarketingFooter";
import { MarketingNav } from "@/marketing/components/MarketingNav";

type LegalDocumentProps = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalDocument({
  title,
  updatedAt,
  children,
}: LegalDocumentProps) {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main className="px-6 py-12 lg:px-12 lg:py-16">
        <article className="mx-auto max-w-3xl">
          <header className="mb-10 flex flex-col gap-3 border-b border-border pb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
              Documento legal
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm text-text-muted">
              Última atualização: {updatedAt}
            </p>
          </header>
          <div className="legal-prose flex flex-col gap-8 text-base leading-relaxed text-text-muted [&_a]:font-medium [&_a]:text-brand-dark [&_a]:underline-offset-2 hover:[&_a]:text-brand-accent hover:[&_a]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-brand-dark [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-brand-dark [&_li]:leading-relaxed [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-brand-dark [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}
