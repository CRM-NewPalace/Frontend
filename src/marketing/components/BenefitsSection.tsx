import type { IconType } from "react-icons";
import {
  HiArrowPath,
  HiArrowTrendingUp,
  HiChartBarSquare,
  HiCubeTransparent,
  HiFolderOpen,
  HiLink,
  HiRocketLaunch,
  HiSparkles,
  HiUserGroup,
} from "react-icons/hi2";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { label: "Redução de retrabalho", icon: HiArrowPath },
  { label: "Tudo centralizado", icon: HiCubeTransparent },
  { label: "Mais produtividade", icon: HiRocketLaunch },
  { label: "Mais vendas", icon: HiArrowTrendingUp },
  { label: "Informações organizadas", icon: HiFolderOpen },
  { label: "Equipe integrada", icon: HiUserGroup },
  { label: "Atendimento inteligente", icon: HiSparkles },
  { label: "Automações", icon: HiLink },
  { label: "Decisão com dados", icon: HiChartBarSquare },
] as const;

function BenefitCard({
  label,
  icon: Icon,
  className,
}: {
  label: string;
  icon: IconType;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-3 shadow-sm sm:gap-4 sm:px-5 sm:py-4",
        className,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 text-brand-dark sm:h-5 sm:w-5" />
      </div>
      <p className="text-xs font-medium leading-snug text-brand-dark sm:text-base">
        {label}
      </p>
    </article>
  );
}

export function BenefitsSection() {
  return (
    <section className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Benefícios
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            O que muda na rotina da sua imobiliária.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
          {BENEFITS.map((benefit, index) => {
            const isLastCentered =
              index === BENEFITS.length - 1 && BENEFITS.length % 2 !== 0;

            return (
              <BenefitCard
                key={benefit.label}
                {...benefit}
                className={cn(
                  isLastCentered &&
                    "col-span-2 w-[calc(50%-0.25rem)] justify-self-center sm:w-[calc(50%-0.5rem)] lg:col-span-1 lg:w-auto lg:justify-self-stretch",
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
