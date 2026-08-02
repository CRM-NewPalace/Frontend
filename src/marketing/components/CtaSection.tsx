import { getWhatsAppUrl } from "@/lib/env";

export function CtaSection() {
  return (
    <section id="contato" className="px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="bg-brand-cta flex flex-col items-center gap-5 rounded-3xl px-6 py-10 text-center sm:gap-6 sm:px-10 sm:py-12 lg:px-16 lg:py-14">
          <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
            Transforme a gestão da sua imobiliária.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base lg:text-lg">
            Conheça na prática como a Zone Connection centraliza toda a sua
            operação e automatiza o atendimento com inteligência artificial.
          </p>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 rounded-full bg-white px-7 py-3 text-sm font-medium text-brand-dark transition-colors hover:bg-white/90 sm:px-8 sm:py-3.5 sm:text-base"
          >
            Adquirir um plano
          </a>
        </div>
      </div>
    </section>
  );
}
