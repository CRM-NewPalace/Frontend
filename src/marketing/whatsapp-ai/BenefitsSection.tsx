import type { IconType } from "react-icons";
import {
  HiClock,
  HiCursorArrowRays,
  HiDevicePhoneMobile,
  HiSparkles,
  HiUserGroup,
  HiChartBarSquare,
} from "react-icons/hi2";

const BENEFITS: { label: string; text: string; icon: IconType }[] = [
  {
    icon: HiClock,
    label: "Atendimento imediato",
    text: "O cliente recebe resposta na hora, inclusive fora do horário comercial.",
  },
  {
    icon: HiCursorArrowRays,
    label: "Mais leads no funil",
    text: "Conversas deixam de morrer no WhatsApp e passam a alimentar o CRM.",
  },
  {
    icon: HiUserGroup,
    label: "Distribuição justa",
    text: "Oportunidades chegam ao corretor certo, com regras claras da imobiliária.",
  },
  {
    icon: HiSparkles,
    label: "Qualificação automática",
    text: "A IA coleta intenção, perfil e preferências antes do humano entrar.",
  },
  {
    icon: HiDevicePhoneMobile,
    label: "Menos trabalho manual",
    text: "Sem copiar conversa, sem preencher ficha do zero, sem perder contexto.",
  },
  {
    icon: HiChartBarSquare,
    label: "Visibilidade comercial",
    text: "Gestores acompanham origem, volume e andamento dos leads no sistema.",
  },
];

export function BenefitsSection() {
  return (
    <section className="bg-white px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Benefícios
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            O que muda no dia a dia da imobiliária.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, label, text }) => (
            <article
              key={label}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/50 p-5 sm:p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/10">
                <Icon className="h-5 w-5 text-brand-dark" />
              </div>
              <h3 className="text-base font-semibold text-brand-dark sm:text-lg">
                {label}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted sm:text-base">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
