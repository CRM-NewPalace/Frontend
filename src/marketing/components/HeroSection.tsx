import { Link } from "@tanstack/react-router";
import { HeroDiagram } from "./HeroDiagram";
import { getWhatsAppUrl } from "@/lib/env";

export function HeroSection() {
  return (
    <section className="bg-white px-6 pt-4 pb-10 lg:px-12 lg:pt-2 lg:pb-5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
        {/* Coluna esquerda */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-accent" />
            <span className="text-sm font-medium text-brand-dark">
              Zone Connection - Imobiliárias
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold leading-tight text-brand-dark sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Toda a gestão da sua imobiliária em{" "}
              <span className="text-gradient-brand">um único lugar.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
              A Zone Connection conecta CRM, financeiro, imóveis, atendimento,
              contratos, funil comercial e inteligência artificial em uma só
              plataforma — sem retrabalho, sem informação perdida, sem dez
              sistemas diferentes.
            </p>
          </div>

          <div className="flex flex-nowrap items-center gap-2 sm:gap-3">
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 whitespace-nowrap rounded-full bg-brand-dark px-3 py-2.5 text-center text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 sm:flex-none sm:px-7 sm:py-3 sm:text-base"
            >
              Entrar em contato
            </a>
            <Link
              to="/login"
              className="flex-1 whitespace-nowrap rounded-full border border-brand-dark px-3 py-2.5 text-center text-xs font-medium text-brand-dark transition-colors hover:bg-brand-dark/5 sm:flex-none sm:px-7 sm:py-2 sm:text-base"
            >
              Conhecer a plataforma
            </Link>
          </div>
        </div>

        {/* Coluna direita — diagrama animado */}
        <div className="flex justify-center lg:justify-end">
          <HeroDiagram />
        </div>
      </div>
    </section>
  );
}
