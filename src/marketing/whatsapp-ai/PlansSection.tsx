import { HiCheck, HiSparkles } from "react-icons/hi2";
import { getWhatsAppUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  tagline: string;
  setupFee: string;
  monthlyFee: string;
  featured?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "sdr",
    name: "IA SDR",
    tagline: "Qualifica, responde e agenda automaticamente.",
    setupFee: "R$ 990,00",
    monthlyFee: "R$ 397,00",
    features: [
      "Pré-atendimento 24h",
      "Qualificação automática de leads",
      "Respostas instantâneas",
      "Agendamento automático",
      "Integração com o CRM",
    ],
  },
  {
    id: "comercial",
    name: "IA Comercial",
    tagline: "Atende, negocia e fecha mais negócios.",
    setupFee: "R$ 2.490,00",
    monthlyFee: "R$ 997,00",
    featured: true,
    features: [
      "Atendimento 24h",
      "Envio automático de imóveis",
      "Follow-up automático",
      "Respostas inteligentes",
      "Agendamento de visitas",
      "Integração com o CRM",
    ],
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
          Mais completo
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 pr-24">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Plano
          </span>
          <h3 className="text-2xl font-semibold text-brand-dark">{plan.name}</h3>
          <p className="text-sm leading-relaxed text-text-muted sm:text-base">
            {plan.tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-muted/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Implantação
            </p>
            <p className="mt-1 text-xl font-semibold text-brand-dark">
              {plan.setupFee}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Mensalidade
            </p>
            <p className="mt-1 text-xl font-semibold text-brand-dark">
              {plan.monthlyFee}
              <span className="text-sm font-medium text-text-muted">/mês</span>
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <p className="text-sm font-bold text-brand-dark">Incluso no plano</p>
          <ul className="flex flex-col gap-2.5">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-sm leading-snug text-text-muted sm:text-base"
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
      </div>

      <div className="mt-auto border-t border-border/70 bg-surface-muted/40 p-5 sm:p-6">
        <a
          href={getWhatsAppUrl(
            `Olá! Tenho interesse no plano ${plan.name} da Zone Connection.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "block w-full rounded-full px-4 py-3 text-center text-sm font-semibold transition-all duration-200",
            plan.featured
              ? "bg-brand-cta text-white shadow-md hover:shadow-lg hover:brightness-105"
              : "border-2 border-brand-dark bg-white text-brand-dark hover:bg-brand-dark hover:text-white",
          )}
        >
          Quero este plano
        </a>
        <p className="mt-3 text-center text-xs leading-relaxed text-text-muted sm:text-sm">
          Contratando junto com o CRM:{" "}
          <span className="font-semibold text-brand-dark">
            30% de desconto na implantação
          </span>{" "}
          +{" "}
          <span className="font-semibold text-brand-dark">
            20% de desconto na mensalidade
          </span>
          .
        </p>
      </div>
    </article>
  );
}

export function PlansSection() {
  return (
    <section id="planos" className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Planos
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Escolha o nível de automação da sua operação.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Do pré-atendimento que qualifica leads à IA que conduz a conversa
            até o agendamento — sempre integrada ao CRM.
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:gap-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
