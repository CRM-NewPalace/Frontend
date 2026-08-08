import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  HiArrowPathRoundedSquare,
  HiChatBubbleLeftRight,
  HiUserGroup,
} from "react-icons/hi2";

const FLOW = [
  {
    icon: HiChatBubbleLeftRight,
    label: "WhatsApp",
    detail: "Atendimento com IA",
  },
  {
    icon: HiArrowPathRoundedSquare,
    label: "Integração",
    detail: "Dados e histórico",
  },
  {
    icon: HiUserGroup,
    label: "CRM Imobiliário",
    detail: "Lead + distribuição",
  },
] as const;

export function IntegrationSection() {
  return (
    <section className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-4 lg:max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Integração com o CRM
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            O atendimento deixa de viver só no celular.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Cada conversa qualificada vira lead no CRM Imobiliário da Zone
            Connection. A equipe vê o contexto, acompanha o funil e distribui
            oportunidades com regra — sem copiar e colar dados do WhatsApp.
          </p>
          <ul className="mt-2 flex flex-col gap-2.5 text-sm text-text-muted sm:text-base">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              Lead criado automaticamente a partir da conversa
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              Distribuição alinhada às regras da imobiliária
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              Histórico disponível para o corretor continuar o atendimento
            </li>
          </ul>
          <Link
            to="/produtos/crm-imobiliario"
            className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-dark transition-all hover:gap-2.5 hover:text-brand-accent sm:text-base"
          >
            Conhecer o CRM Imobiliário
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
          {FLOW.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
              >
                <div className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm sm:w-40 sm:items-center sm:text-center lg:w-44">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold text-brand-dark">
                    {item.label}
                  </p>
                  <p className="text-sm text-text-muted">{item.detail}</p>
                </div>
                {index < FLOW.length - 1 ? (
                  <ArrowRight
                    className="mx-auto h-5 w-5 rotate-90 text-brand-accent sm:mx-0 sm:rotate-0"
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
