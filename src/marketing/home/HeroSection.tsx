import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getWhatsAppUrl } from "@/lib/env";
import { HOME_ANCHORS } from "./routes";
import { HeroShowcase } from "./HeroShowcase";

const HIGHLIGHTS = [
  "Funil, leads e agenda no mesmo fluxo",
  "Financeiro e comissões sem planilha",
  "IA no WhatsApp ligada ao CRM",
  "Site e landing page no ecossistema",
] as const;

const STATS = [
  { value: "1", label: "plataforma para a operação" },
  { value: "3", label: "soluções conectadas" },
  { value: "0", label: "planilha paralela no dia a dia" },
] as const;

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="px-6 pt-10 pb-12 lg:px-12 lg:pt-16 lg:pb-20"
      aria-labelledby="home-hero-title"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            className="flex max-w-xl flex-col"
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-text-muted uppercase">
              <span
                className="h-1.5 w-1.5 rounded-full bg-brand-accent"
                aria-hidden
              />
              Zone Connection
            </p>
            <h1
              id="home-hero-title"
              className="text-3xl font-semibold leading-tight tracking-tight text-brand-dark sm:text-4xl lg:text-[2.85rem] lg:leading-[1.12]"
            >
              Tecnologia feita para a rotina da{" "}
              <span className="text-gradient-brand">imobiliária</span>.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-text-muted sm:text-lg">
              CRM, atendimento no WhatsApp e presença digital no mesmo
              ecossistema — para leads, contratos, financeiro e equipe
              trabalharem juntos.
            </p>

            <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-snug text-brand-dark"
                >
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-accent/15 text-brand-accent"
                    aria-hidden
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={getWhatsAppUrl(
                  "Olá! Quero conhecer as soluções da Zone Connection.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-brand-dark px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-brand-dark/90 sm:text-base"
              >
                Comece agora
              </a>
              <Link
                to="/demonstracao"
                className="inline-flex items-center justify-center rounded-full border border-brand-dark/20 bg-white px-8 py-3.5 text-sm font-semibold text-brand-dark shadow-sm transition-all hover:-translate-y-px hover:border-brand-dark/40 sm:text-base"
              >
                Ver demonstração
              </Link>
              <a
                href={HOME_ANCHORS.ecosystem}
                className="inline-flex items-center justify-center px-2 text-sm font-medium text-brand-accent transition-colors hover:text-brand-dark"
              >
                Conheça as soluções
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroShowcase />
          </motion.div>
        </div>

        <dl className="mt-14 grid gap-6 border-t border-border/80 pt-10 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
                {stat.value}
              </dd>
              <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
