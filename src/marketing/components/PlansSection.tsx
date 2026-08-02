import { HiCheck, HiStar, HiUsers } from "react-icons/hi2";
import { getWhatsAppUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

interface ContractTerm {
  duration: string;
  discount: string;
  price: string;
  bestValue?: boolean;
}

interface PlanTheme {
  header: string;
  medal: string;
  accent: string;
  priceCard: string;
  contractBest: string;
}

interface Plan {
  id: string;
  medal: string;
  name: string;
  audience: string;
  users: string;
  setupFee: string;
  monthlyFee: string;
  contractTerms: ContractTerm[];
  theme: PlanTheme;
  featured?: boolean;
  highlights?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "bronze",
    medal: "🥉",
    name: "Bronze",
    audience: "Ideal para pequenas imobiliárias",
    users: "Até 5 usuários",
    setupFee: "R$ 790,00",
    monthlyFee: "R$ 397,00/mensal",
    theme: {
      header: "from-amber-50 via-orange-50/80 to-white",
      medal: "bg-amber-100 ring-amber-200/80",
      accent: "text-amber-700",
      priceCard: "border-amber-100 bg-amber-50/60",
      contractBest: "border-amber-300 bg-amber-50 ring-amber-200/60",
    },
    contractTerms: [
      { duration: "3 meses", discount: "Sem desconto", price: "R$ 397,00/mês" },
      {
        duration: "6 meses",
        discount: "10% de desconto",
        price: "R$ 357,30/mês",
      },
      {
        duration: "12 meses",
        discount: "25% de desconto",
        price: "R$ 297,75/mês",
        bestValue: true,
      },
    ],
    features: [
      "CRM com os módulos: imóveis, funil de vendas",
      "Agenda personalizada",
      "Cadastros de imóveis",
      "Relatórios básicos",
    ],
  },
  {
    id: "prata",
    medal: "🥈",
    name: "Prata",
    audience: "Ideal para imobiliárias em crescimento",
    users: "Até 15 usuários",
    setupFee: "R$ 1.490,00",
    monthlyFee: "R$ 997,00/mensal",
    theme: {
      header: "from-slate-100 via-zinc-50/90 to-white",
      medal: "bg-slate-200 ring-slate-300/70",
      accent: "text-slate-600",
      priceCard: "border-slate-200 bg-slate-50/80",
      contractBest: "border-slate-300 bg-slate-100 ring-slate-300/60",
    },
    contractTerms: [
      { duration: "3 meses", discount: "Sem desconto", price: "R$ 997,00/mês" },
      {
        duration: "6 meses",
        discount: "10% de desconto",
        price: "R$ 897,30/mês",
      },
      {
        duration: "12 meses",
        discount: "25% de desconto",
        price: "R$ 747,75/mês",
        bestValue: true,
      },
    ],
    features: [
      "Tudo do plano Bronze",
      "Financeiro com: contas a pagar, contas a receber, relatório financeiro",
      "Fluxo de caixa",
      "Comissões",
    ],
  },
  {
    id: "ouro",
    medal: "🥇",
    name: "Ouro",
    audience: "Gestão completa e máxima performance",
    users: "Até 30 usuários",
    setupFee: "R$ 1.490,00",
    monthlyFee: "R$ 1.497,00/mensal",
    theme: {
      header: "from-brand-accent/15 via-cyan-50/80 to-white",
      medal: "bg-brand-accent/15 ring-brand-accent/30",
      accent: "text-brand-accent",
      priceCard: "border-brand-accent/20 bg-brand-accent/5",
      contractBest:
        "border-brand-accent/40 bg-brand-accent/10 ring-brand-accent/25",
    },
    contractTerms: [
      {
        duration: "3 meses",
        discount: "Sem desconto",
        price: "R$ 1.497,00/mês",
      },
      {
        duration: "6 meses",
        discount: "10% de desconto",
        price: "R$ 1.347,30/mês",
      },
      {
        duration: "12 meses",
        discount: "30% de desconto",
        price: "R$ 1.047,90/mês",
        bestValue: true,
      },
    ],
    featured: true,
    highlights: true,
    features: [
      "Tudo do plano Prata",
      "Alertas de documentações",
      "Gestão de documentações",
      "Landing pages com Google Analytics",
      "Relatórios avançados",
      "IA no WhatsApp (em desenvolvimento)",
    ],
  },
];

function PlanPriceCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-20 flex-col justify-center gap-1.5 rounded-xl border px-3 py-3",
        className,
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="text-base font-bold leading-tight text-brand-dark sm:text-lg">
        {value}
      </span>
    </div>
  );
}

function PlanContractTermCard({
  term,
  theme,
  fullWidth = false,
}: {
  term: ContractTerm;
  theme: PlanTheme;
  fullWidth?: boolean;
}) {
  if (fullWidth) {
    return (
      <div
        className={cn(
          "relative flex min-h-20 items-center gap-4 rounded-xl border px-4 py-3",
          term.bestValue
            ? cn("ring-1", theme.contractBest)
            : "border-border bg-white/80",
        )}
      >
        {term.bestValue && (
          <span className="absolute -top-2 left-4 whitespace-nowrap rounded-full bg-brand-dark px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Melhor valor
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-bold text-brand-dark">
            {term.duration}
          </span>
          <span className="text-xs leading-tight text-text-muted">
            {term.discount}
          </span>
        </div>

        <div className="h-10 w-px shrink-0 bg-border" aria-hidden />

        <span className="shrink-0 text-right text-base font-bold leading-tight text-brand-dark sm:text-lg">
          {term.price}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-24 flex-col justify-center gap-1.5 rounded-xl border px-2.5 py-3 text-center sm:px-3",
        term.bestValue
          ? cn("ring-1", theme.contractBest)
          : "border-border bg-white/80",
      )}
    >
      <span className="text-xs font-bold text-brand-dark sm:text-sm">
        {term.duration}
      </span>
      <span className="text-xs leading-tight text-text-muted">
        {term.discount}
      </span>
      <span className="text-sm font-bold leading-tight text-brand-dark sm:text-base">
        {term.price}
      </span>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        plan.featured
          ? "border-brand-accent/40 shadow-md ring-1 ring-brand-accent/20"
          : "border-border hover:border-brand-accent/25",
      )}
    >
      <div
        className={cn(
          "relative border-b border-border/60 bg-linear-to-br px-5 pb-5 pt-6 sm:px-6",
          plan.theme.header,
        )}
      >
        {plan.featured && (
          <span className="absolute right-4 top-4 rounded-full bg-brand-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Mais popular
          </span>
        )}

        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ring-1",
              plan.theme.medal,
            )}
            aria-hidden
          >
            {plan.medal}
          </span>
          <div className="min-w-0 flex-1 pr-16">
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                plan.theme.accent,
              )}
            >
              Plano {plan.name}
            </p>
            <h3 className="mt-1 text-xl font-bold leading-tight text-brand-dark sm:text-2xl">
              {plan.name}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted sm:text-sm">
              {plan.audience}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1.5">
          <HiUsers
            className={cn("h-4 w-4 shrink-0", plan.theme.accent)}
            aria-hidden
          />
          <span className="text-sm font-semibold text-brand-dark">
            {plan.users}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <PlanPriceCard
            label="Implantação"
            value={plan.setupFee}
            className={plan.theme.priceCard}
          />
          <PlanPriceCard
            label="Mensalidade"
            value={plan.monthlyFee}
            className={plan.theme.priceCard}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <p className="text-sm font-bold text-brand-dark">Recursos inclusos</p>
          <ul className="flex flex-1 flex-col gap-2.5">
            {plan.features.map((feature, index) => (
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
                  {plan.highlights && index > 0 ? (
                    <HiStar className={cn("h-3 w-3", plan.theme.accent)} />
                  ) : (
                    <HiCheck className={cn("h-3 w-3", plan.theme.accent)} />
                  )}
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto border-t border-border/70 bg-surface-muted/40 p-5 sm:p-6">
        <p className="mb-3 text-sm font-bold text-brand-dark">
          Condições contratuais
        </p>
        <div className="grid grid-cols-2 gap-2">
          {plan.contractTerms.slice(0, 2).map((term) => (
            <PlanContractTermCard
              key={term.duration}
              term={term}
              theme={plan.theme}
            />
          ))}
          <div className="col-span-2">
            <PlanContractTermCard
              key={plan.contractTerms[2].duration}
              term={plan.contractTerms[2]}
              theme={plan.theme}
              fullWidth
            />
          </div>
        </div>

        <a
          href={getWhatsAppUrl(
            `Olá! Tenho interesse no plano ${plan.name} da Zone Connection.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-4 block w-full rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-all duration-200",
            plan.featured
              ? "bg-brand-cta text-white shadow-md hover:shadow-lg hover:brightness-105"
              : "border-2 border-brand-dark bg-white text-brand-dark hover:bg-brand-dark hover:text-white",
          )}
        >
          Fale conosco
        </a>
      </div>
    </article>
  );
}

export function PlansSection() {
  return (
    <section id="planos" className="bg-white px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Planos
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            O plano certo para cada fase da sua imobiliária.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Do primeiro passo longe das planilhas até a operação inteligente que
            gera mais vendas.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
