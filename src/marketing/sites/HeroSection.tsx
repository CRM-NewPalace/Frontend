import { getSitesWhatsAppUrl } from "@/lib/env";
import {
  HiBuildingOffice2,
  HiDevicePhoneMobile,
  HiGlobeAlt,
} from "react-icons/hi2";

const WHATSAPP_MSG =
  "Olá! Quero conhecer sites e landing pages da Zone Connection.";

export function HeroSection() {
  return (
    <section className="bg-white px-6 pt-10 pb-10 lg:px-12 lg:pt-14 lg:pb-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-accent" />
            <span className="text-sm font-medium text-brand-dark">
              Zone Connection — Sites e Landing Pages
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold leading-tight text-brand-dark sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Presença digital para{" "}
              <span className="text-gradient-brand">imobiliárias</span> e{" "}
              <span className="text-gradient-brand">corretores</span>.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
              Sites institucionais que reforçam a marca da imobiliária e landing
              pages pensadas para o corretor captar, atender e converter leads
              no dia a dia.
            </p>
          </div>

          <div className="flex flex-nowrap items-center gap-2 sm:gap-3">
            <a
              href={getSitesWhatsAppUrl(WHATSAPP_MSG)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 whitespace-nowrap rounded-full bg-brand-dark px-3 py-2.5 text-center text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 sm:flex-none sm:px-7 sm:py-3 sm:text-base"
            >
              Solicitar orçamento
            </a>
            <a
              href="#planos"
              className="flex-1 whitespace-nowrap rounded-full border border-brand-dark px-3 py-2.5 text-center text-xs font-medium text-brand-dark transition-colors hover:bg-brand-dark/5 sm:flex-none sm:px-7 sm:py-2.5 sm:text-base"
            >
              Ver planos
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/50 p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark text-white">
              <HiBuildingOffice2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-brand-dark">
              Site institucional
            </h2>
            <p className="text-sm leading-relaxed text-text-muted">
              Para imobiliárias que precisam de uma vitrine profissional,
              credibilidade e canal próprio de captação.
            </p>
            <span className="mt-auto inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-brand-accent">
              <HiGlobeAlt className="h-3.5 w-3.5" />
              Sob consulta
            </span>
          </article>

          <article className="flex flex-col gap-3 rounded-2xl border border-brand-accent/30 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
              <HiDevicePhoneMobile className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-brand-dark">
              Landing page
            </h2>
            <p className="text-sm leading-relaxed text-text-muted">
              Para corretores que querem uma página própria para divulgar
              imóveis, captar leads e atender pelo WhatsApp.
            </p>
            <span className="mt-auto inline-flex w-fit rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent">
              A partir de R$ 190
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}
