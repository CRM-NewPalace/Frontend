import { motion, useReducedMotion } from "framer-motion";
import { HOME_ANCHORS } from "./routes";

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="px-6 py-16 lg:px-12 lg:py-28"
      aria-labelledby="home-hero-title"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center">
        <motion.div
          className="flex max-w-5xl flex-col items-center text-center"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-5 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-text-muted uppercase">
            <span
              className="h-1.5 w-1.5 rounded-full bg-brand-dark"
              aria-hidden
            />
            Zone Connection
          </p>
          <h1
            id="home-hero-title"
            className="max-w-5xl text-3xl font-semibold tracking-[0.04em] text-brand-dark sm:text-4xl sm:tracking-[0.055em] lg:text-5xl lg:leading-[1.15] lg:tracking-[0.07em]"
          >
            Tecnologia feita para a rotina da imobiliária.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
            CRM, atendimento no WhatsApp e presença digital no mesmo ecossistema
            — para leads, contratos, financeiro e equipe trabalharem juntos, sem
            planilha solta nem sistema paralelo.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={HOME_ANCHORS.ecosystem}
              className="inline-flex items-center justify-center rounded-full bg-brand-dark px-7 py-3 text-sm font-medium text-white transition-all hover:-translate-y-px hover:bg-brand-dark/90 sm:text-base"
            >
              Conheça nossas soluções
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
