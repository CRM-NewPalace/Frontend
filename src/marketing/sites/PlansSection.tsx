import { HiCheck, HiSparkles } from "react-icons/hi2";
import { getSitesWhatsAppUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  audience: string;
  price: string;
  priceNote?: string;
  featured?: boolean;
  consultation?: boolean;
  features: string[];
  cta: string;
  whatsappMsg: string;
}

const PLANS: Plan[] = [
  {
    id: "landing-parceiro",
    name: "Landing Page — Corretor parceiro",
    audience:
      "Para corretores de imobiliárias parceiras que possuem um plano do CRM Zone Connection.",
    price: "R$ 190",
    priceNote: "Hospedagem e domínio inclusos",
    featured: true,
    features: [
      "Página profissional do corretor",
      "Hospedagem inclusa",
      "Domínio incluso",
      "Ideal para bio, anúncios e WhatsApp",
      "Condição exclusiva para imobiliárias no CRM",
    ],
    cta: "Quero a landing de parceiro",
    whatsappMsg:
      "Olá! Sou corretor de imobiliária parceira (com plano do CRM) e quero a landing page por R$ 190.",
  },
  {
    id: "landing-avulso",
    name: "Landing Page — Fora dos planos",
    audience:
      "Para corretores que ainda não estão em uma imobiliária com plano do CRM Zone Connection.",
    price: "R$ 300",
    priceNote: "Landing page avulsa",
    features: [
      "Página profissional do corretor",
      "Estrutura pronta para captar leads",
      "Link para WhatsApp e redes",
      "Uso em campanhas e divulgação diária",
    ],
    cta: "Quero a landing avulsa",
    whatsappMsg:
      "Olá! Quero a landing page para corretores por R$ 300.",
  },
  {
    id: "site-institucional",
    name: "Site institucional",
    audience:
      "Para imobiliárias que precisam de um site completo, sob medida para a marca e a operação.",
    price: "Sob consulta",
    consultation: true,
    features: [
      "Site institucional da imobiliária",
      "Estrutura alinhada à marca",
      "Vitrine de imóveis e diferenciais",
      "Projeto e investimento sob consulta",
    ],
    cta: "Solicitar orçamento",
    whatsappMsg:
      "Olá! Quero um orçamento de site institucional para a imobiliária.",
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm",
        plan.featured
          ? "border-brand-accent shadow-md ring-1 ring-brand-accent/20"
          : "border-border",
      )}
    >
      {plan.featured ? (
        <div className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent">
          <HiSparkles className="h-3.5 w-3.5" />
          Parceiro CRM
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
        <div className="flex flex-col gap-2 pr-20">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Plano
          </span>
          <h3 className="text-xl font-semibold text-brand-dark sm:text-2xl">
            {plan.name}
          </h3>
          <p className="text-sm leading-relaxed text-text-muted">
            {plan.audience}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-muted/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Investimento
          </p>
          <p
            className={cn(
              "mt-1 font-semibold text-brand-dark",
              plan.consultation ? "text-2xl" : "text-3xl",
            )}
          >
            {plan.price}
          </p>
          {plan.priceNote ? (
            <p className="mt-1 text-sm text-text-muted">{plan.priceNote}</p>
          ) : null}
        </div>

        <ul className="flex flex-1 flex-col gap-2.5">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm leading-snug text-text-muted"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  plan.featured ? "bg-brand-accent/15" : "bg-surface-muted",
                )}
              >
                <HiCheck
                  className={cn(
                    "h-3 w-3",
                    plan.featured ? "text-brand-accent" : "text-brand-dark",
                  )}
                />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-border/70 bg-surface-muted/40 p-5 sm:p-6">
        <a
          href={getSitesWhatsAppUrl(plan.whatsappMsg)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "block w-full rounded-full px-4 py-3 text-center text-sm font-semibold transition-all duration-200",
            plan.featured
              ? "bg-brand-cta text-white shadow-md hover:shadow-lg hover:brightness-105"
              : "border-2 border-brand-dark bg-white text-brand-dark hover:bg-brand-dark hover:text-white",
          )}
        >
          {plan.cta}
        </a>
      </div>
    </article>
  );
}

export function PlansSection() {
  return (
    <section id="planos" className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Planos e valores
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Landing pages com condição especial para parceiros do CRM.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Corretores de imobiliárias que já têm um plano do CRM Zone
            Connection pagam menos na landing page — com hospedagem e domínio
            inclusos. Sites institucionais são cotados sob consulta.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
