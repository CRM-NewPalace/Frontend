import { Link } from "@tanstack/react-router";
import {
  AppWindow,
  ArrowRight,
  Banknote,
  Cloud,
  Code2,
  FileSearch,
  Layers,
  LayoutTemplate,
  MessageSquareText,
  Network,
} from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { PRODUCT_ROUTES } from "./routes";
import { ScrollReveal } from "./ScrollReveal";

const CHALLENGES = [
  {
    icon: FileSearch,
    text: "Não conseguir acompanhar todos os atendimentos da sua imobiliária",
  },
  {
    icon: Code2,
    text: "Corretor não utilizar o sistema imobiliário",
  },
  {
    icon: Layers,
    text: "Perder tempo construindo e analisando planilhas de vendas e locação",
  },
  {
    icon: AppWindow,
    text: "Utilizar sistemas diferentes para conseguir gerenciar a sua imobiliária e o seu desempenho",
  },
  {
    icon: Cloud,
    text: "Falta de integrações no software de gestão imobiliária",
  },
  {
    icon: Banknote,
    text: "Dar baixa de pagamentos e repasses manualmente, emissão de nota fiscal e envio de relatórios — é tanta tarefa feita à mão?",
  },
] as const;

const PRODUCTS = [
  {
    title: "CRM Imobiliário",
    text: "Uma plataforma completa para gestão de imobiliárias.",
    href: PRODUCT_ROUTES.crm,
    icon: Network,
  },
  {
    title: "IA para WhatsApp",
    text: "Uma Inteligência Artificial integrada ao WhatsApp que conversa com clientes e se conecta ao CRM para automatizar atendimentos.",
    href: PRODUCT_ROUTES.whatsappAi,
    icon: MessageSquareText,
  },
  {
    title: "Sites Institucionais e Landing Pages",
    text: "Desenvolvimento de sites para imobiliárias e landing pages profissionais para corretores captarem mais clientes.",
    href: PRODUCT_ROUTES.sites,
    icon: LayoutTemplate,
  },
] as const;

const linkClass =
  "mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent transition-all hover:gap-2.5 hover:text-white";

export function ChallengesSection() {
  return (
    <section
      id="desafios"
      className="px-6 py-16 lg:px-12 lg:py-24"
      aria-labelledby="challenges-title"
    >
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2
            id="challenges-title"
            className="mx-auto max-w-3xl text-center text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-[2.15rem] lg:leading-tight"
          >
            Você se identifica com algum desses desafios?
          </h2>
        </ScrollReveal>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:mt-16 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14">
          {CHALLENGES.map((item, index) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={item.text} delay={index * 0.05}>
                <article className="mx-auto flex max-w-xs flex-col items-center text-center">
                  <div className="mb-4 grid h-14 w-14 place-items-center text-brand-accent">
                    <Icon size={40} strokeWidth={1.5} aria-hidden />
                  </div>
                  <p className="text-sm leading-relaxed text-text-muted sm:text-[0.95rem] sm:leading-[1.65]">
                    {item.text}
                  </p>
                </article>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.12}>
          <div className="mx-auto mt-16 max-w-3xl text-center lg:mt-20">
            <p className="text-lg font-medium leading-relaxed text-brand-dark sm:text-xl sm:leading-relaxed">
              Tudo isso deixa sua imobiliária lenta, burocrática e atolada de
              tarefas manuais que poderiam ser automatizadas.
            </p>
            <p className="mt-4 text-base text-text-muted sm:text-lg">
              Por isso desenvolvemos essas soluções:
            </p>
          </div>
        </ScrollReveal>

        <div
          id="ecossistema"
          className="mt-12 grid gap-5 md:mt-14 md:grid-cols-3"
        >
          {PRODUCTS.map((product, index) => {
            const Icon = product.icon;
            return (
              <ScrollReveal key={product.title} delay={0.08 + index * 0.08}>
                <article className="flex h-full flex-col rounded-2xl border border-brand-dark/40 bg-brand-dark p-7 shadow-md transition-all hover:-translate-y-1 hover:border-brand-accent/40 hover:shadow-lg">
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-brand-accent">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-white">
                    {product.title}
                  </h3>
                  <p className="flex-1 text-[0.975rem] leading-relaxed text-white/70">
                    {product.text}
                  </p>
                  {product.href === PRODUCT_ROUTES.crm ? (
                    <Link to="/produtos/crm-imobiliario" className={linkClass}>
                      Saiba mais
                      <ArrowRight size={16} strokeWidth={1.75} />
                    </Link>
                  ) : (
                    <a href={product.href} className={linkClass}>
                      Saiba mais
                      <ArrowRight size={16} strokeWidth={1.75} />
                    </a>
                  )}
                </article>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.25}>
          <div className="mt-12 flex justify-center lg:mt-14">
            <a
              href={getWhatsAppUrl(
                "Olá! Quero falar com o time de vendas da Zone Connection.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-brand-accent px-7 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-brand-accent/90 sm:px-8 sm:text-base"
            >
              Fale com nosso time de vendas
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
