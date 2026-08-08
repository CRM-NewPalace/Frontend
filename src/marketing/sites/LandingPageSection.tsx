import { useCallback, useState } from "react";
import type { ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiArrowLeft,
  HiArrowRight,
  HiChatBubbleLeftRight,
  HiLink,
  HiMegaphone,
  HiRectangleGroup,
  HiShare,
  HiSparkles,
} from "react-icons/hi2";
import { cn } from "@/lib/utils";
import {
  AdsPortalMockup,
  DigitalCardMockup,
  InstagramBioMockup,
  WhatsAppShareMockup,
} from "./DayToDayMockups";

const ADVANTAGES = [
  {
    icon: HiSparkles,
    title: "Presença profissional sem complicação",
    text: "O corretor ganha uma página limpa, com foto, especialidade e forma de contato — sem precisar montar um site completo.",
  },
  {
    icon: HiMegaphone,
    title: "Mais conversão em campanhas",
    text: "Ideal para impulsionar no Instagram, Google e WhatsApp Status: o lead cai em uma página feita para converter, não em um perfil genérico.",
  },
  {
    icon: HiChatBubbleLeftRight,
    title: "Atendimento direto no WhatsApp",
    text: "O interessado clica e fala com o corretor. Menos atrito, mais conversas iniciadas no momento certo.",
  },
] as const;

const DAY_TO_DAY: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
  Mockup: ComponentType<{ large?: boolean }>;
}[] = [
  {
    icon: HiShare,
    title: "Bio do Instagram e TikTok",
    text: "Coloque o link da landing page na bio e transforme seguidores em leads qualificados.",
    Mockup: InstagramBioMockup,
  },
  {
    icon: HiLink,
    title: "Status e grupos de WhatsApp",
    text: "Compartilhe o link ao divulgar lançamentos, imóveis novos ou plantões de vendas.",
    Mockup: WhatsAppShareMockup,
  },
  {
    icon: HiRectangleGroup,
    title: "Anúncios e portais",
    text: "Use a página como destino de campanhas pagas ou material de apoio quando o cliente pede “me manda seu site”.",
    Mockup: AdsPortalMockup,
  },
  {
    icon: HiMegaphone,
    title: "Cartão digital e networking",
    text: "Envie o link no primeiro contato, no cartão digital ou após uma visita — o corretor fica fácil de encontrar depois.",
    Mockup: DigitalCardMockup,
  },
];

function DayToDayCarousel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const goTo = useCallback((next: number, dir: number) => {
    if (next < 0 || next >= DAY_TO_DAY.length) return;
    setDirection(dir);
    setIndex(next);
  }, []);

  const current = DAY_TO_DAY[index];
  const Icon = current.icon;
  const Mockup = current.Mockup;

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
        <h3 className="text-xl font-semibold text-brand-dark sm:text-2xl">
          Como usar no dia a dia
        </h3>
        <p className="text-base leading-relaxed text-text-muted">
          A landing page rende mais quando entra na rotina comercial do corretor
          — em cada ponto de contato com o cliente.
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={() => goTo(index - 1, -1)}
          disabled={index === 0}
          aria-label="Uso anterior"
          className={cn(
            "absolute top-1/2 left-0 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-brand-dark shadow-sm transition-colors sm:-left-4 lg:-left-6",
            index === 0
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-brand-dark/5",
          )}
        >
          <HiArrowLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => goTo(index + 1, 1)}
          disabled={index >= DAY_TO_DAY.length - 1}
          aria-label="Próximo uso"
          className={cn(
            "absolute top-1/2 right-0 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-brand-dark shadow-sm transition-colors sm:-right-4 lg:-right-6",
            index >= DAY_TO_DAY.length - 1
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-brand-dark/5",
          )}
        >
          <HiArrowRight className="h-5 w-5" />
        </button>

        <div className="overflow-hidden px-10 sm:px-14">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.article
              key={current.title}
              custom={direction}
              initial={{ opacity: 0, x: direction >= 0 ? 48 : -48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -48 : 48 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center gap-8 rounded-3xl border border-border bg-surface-muted/40 px-6 py-8 shadow-sm sm:px-10 sm:py-10"
            >
              <Mockup large />

              <div className="flex max-w-lg flex-col items-center gap-3 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-dark text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-brand-accent" />
                  <h4 className="text-xl font-semibold text-brand-dark sm:text-2xl">
                    {current.title}
                  </h4>
                </div>
                <p className="text-base leading-relaxed text-text-muted sm:text-lg">
                  {current.text}
                </p>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-brand-dark">
          {index + 1} de {DAY_TO_DAY.length}
        </p>
        <div className="flex items-center gap-1.5">
          {DAY_TO_DAY.map((item, i) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Ir para ${item.title}`}
              onClick={() => goTo(i, i > index ? 1 : -1)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index
                  ? "w-6 bg-brand-accent"
                  : "w-2 bg-border hover:bg-brand-accent/40",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPageSection() {
  return (
    <section className="bg-white px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:gap-16">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Landing page para corretores
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Vantagens de o corretor ter a própria landing page.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            A landing page é a vitrine individual do corretor: rápida de
            compartilhar, pensada para captar interesse e conduzir o cliente
            para o atendimento.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ADVANTAGES.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/50 p-5 sm:p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/10">
                <Icon className="h-5 w-5 text-brand-dark" />
              </div>
              <h3 className="text-base font-semibold text-brand-dark sm:text-lg">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted sm:text-base">
                {text}
              </p>
            </article>
          ))}
        </div>

        <DayToDayCarousel />
      </div>
    </section>
  );
}
