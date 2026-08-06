import { useCallback, useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  HiArrowLeft,
  HiArrowRight,
  HiBuildingOffice2,
  HiCalendarDays,
  HiChartBar,
  HiClipboardDocumentList,
  HiCursorArrowRays,
  HiDocumentText,
  HiFolderOpen,
  HiFunnel,
  HiHomeModern,
  HiPresentationChartLine,
  HiSquares2X2,
  HiUserCircle,
  HiUserGroup,
  HiUsers,
  HiWallet,
} from "react-icons/hi2";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Alinhado aos módulos reais do sistema (`tenant-modules` + menu do app). */
const MODULES = [
  {
    title: "Dashboard",
    description: "Visão executiva da operação inteira em uma única tela.",
    icon: HiSquares2X2,
  },
  {
    title: "Vendas",
    description:
      "Acompanhe negociações e resultados comerciais com clareza e foco em fechamento.",
    icon: HiPresentationChartLine,
  },
  {
    title: "Leads",
    description:
      "Captação centralizada, distribuição automática e nenhum contato perdido.",
    icon: HiCursorArrowRays,
  },
  {
    title: "Funil",
    description:
      "Etapas claras, previsibilidade de vendas e acompanhamento por corretor.",
    icon: HiFunnel,
  },
  {
    title: "Triagem",
    description:
      "Organize e qualifique leads antes de entrar no funil comercial.",
    icon: HiClipboardDocumentList,
  },
  {
    title: "Agenda",
    description:
      "Visitas, follow-ups e compromissos sincronizados com toda a equipe.",
    icon: HiCalendarDays,
  },
  {
    title: "Imóveis",
    description:
      "Carteira organizada, fotos, documentos e disponibilidade em tempo real.",
    icon: HiHomeModern,
  },
  {
    title: "Clientes",
    description:
      "Histórico completo de cada cliente, interações e negociações em um só lugar.",
    icon: HiUserCircle,
  },
  {
    title: "Construtoras",
    description:
      "Cadastro e gestão de construtoras e empreendimentos parceiros.",
    icon: HiBuildingOffice2,
  },
  {
    title: "Leads Perdidos",
    description:
      "Analise perdas, motivos e oportunidades de recuperação de contatos.",
    icon: HiCursorArrowRays,
  },
  {
    title: "Equipes",
    description:
      "Estruture times, responsabilidades e performance por grupo de trabalho.",
    icon: HiUsers,
  },
  {
    title: "Corretores",
    description:
      "Gestão de corretores, acesso e acompanhamento da atuação comercial.",
    icon: HiUserGroup,
  },
  {
    title: "Documentação",
    description:
      "Centralize documentos do processo comercial com organização e rastreio.",
    icon: HiFolderOpen,
  },
  {
    title: "Análise",
    description:
      "Indicadores e leituras de desempenho para decisões mais rápidas.",
    icon: HiChartBar,
  },
  {
    title: "Metas",
    description:
      "Defina, acompanhe e cobre metas comerciais por equipe e corretor.",
    icon: HiPresentationChartLine,
  },
  {
    title: "Propostas",
    description:
      "Monte e acompanhe propostas comerciais com composição financeira clara.",
    icon: HiDocumentText,
  },
  {
    title: "Taxa de conversão",
    description:
      "Meça a eficiência do funil e identifique gargalos na jornada de vendas.",
    icon: HiChartBar,
  },
  {
    title: "Financeiro",
    description:
      "Recebimentos, repasses, comissões, fluxo de caixa e inadimplência sob controle.",
    icon: HiWallet,
  },
] as const;

function useCardsPerPage() {
  const [cardsPerPage, setCardsPerPage] = useState(3);

  useEffect(() => {
    function updateCardsPerPage() {
      if (window.innerWidth < 640) setCardsPerPage(1);
      else if (window.innerWidth < 1024) setCardsPerPage(2);
      else setCardsPerPage(3);
    }

    updateCardsPerPage();
    window.addEventListener("resize", updateCardsPerPage);
    return () => window.removeEventListener("resize", updateCardsPerPage);
  }, []);

  return cardsPerPage;
}

function ModuleCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: IconType;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/10">
        <Icon className="h-5 w-5 text-brand-accent" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-brand-dark sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
    </article>
  );
}

export function ModulesSection() {
  const cardsPerPage = useCardsPerPage();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const totalPages = Math.ceil(MODULES.length / cardsPerPage);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  const startIndex = safePage * cardsPerPage;
  const visibleModules = MODULES.slice(startIndex, startIndex + cardsPerPage);
  const rangeStart = startIndex + 1;
  const rangeEnd = startIndex + visibleModules.length;

  const goTo = useCallback(
    (nextPage: number, nextDirection: number) => {
      if (nextPage < 0 || nextPage >= totalPages) return;
      setDirection(nextDirection);
      setPage(nextPage);
    },
    [totalPages],
  );

  const indicatorLabel =
    cardsPerPage === 1
      ? `${rangeStart} de ${MODULES.length}`
      : `${rangeStart}–${rangeEnd} de ${MODULES.length}`;

  const handlePrev = () => goTo(safePage - 1, -1);
  const handleNext = () => goTo(safePage + 1, 1);

  return (
    <section
      id="modulos"
      className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Módulos
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Um módulo para cada área. Um sistema para toda a imobiliária.
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative">
            {/* Setas */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={safePage === 0}
              aria-label="Módulos anteriores"
              className={cn(
                "absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-brand-dark shadow-sm transition-colors sm:-left-5",
                safePage === 0
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-brand-dark/5",
              )}
            >
              <HiArrowLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={safePage >= totalPages - 1}
              aria-label="Próximos módulos"
              className={cn(
                "absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-brand-dark shadow-sm transition-colors sm:-right-5",
                safePage >= totalPages - 1
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-brand-dark/5",
              )}
            >
              <HiArrowRight className="h-5 w-5" />
            </button>

            {/* Cards */}
            <div className="overflow-hidden px-6 sm:px-8">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`${safePage}-${cardsPerPage}`}
                  custom={direction}
                  initial={{ opacity: 0, x: direction >= 0 ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction >= 0 ? -40 : 40 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={cn(
                    "grid gap-4",
                    cardsPerPage === 1 && "grid-cols-1",
                    cardsPerPage === 2 && "grid-cols-2",
                    cardsPerPage === 3 && "grid-cols-3",
                  )}
                >
                  {visibleModules.map((module) => (
                    <ModuleCard key={module.title} {...module} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Indicador */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-brand-dark">
              {indicatorLabel}
            </p>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Ir para página ${index + 1}`}
                  onClick={() => goTo(index, index > safePage ? 1 : -1)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === safePage
                      ? "w-6 bg-brand-accent"
                      : "w-2 bg-border hover:bg-brand-accent/40",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
