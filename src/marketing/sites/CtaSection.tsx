import { getSitesWhatsAppUrl } from "@/lib/env";

const WHATSAPP_MSG =
  "Olá! Quero conhecer sites e landing pages da Zone Connection.";

export function CtaSection() {
  return (
    <section id="contato" className="px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="bg-brand-cta flex flex-col items-center gap-5 rounded-3xl px-6 py-10 text-center sm:gap-6 sm:px-10 sm:py-12 lg:px-16 lg:py-14">
          <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
            Coloque imobiliária e corretores no digital certo.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base lg:text-lg">
            Site institucional para a marca da imobiliária e landing page para
            o corretor captar no dia a dia — com condição especial para
            parceiros do CRM.
          </p>
          <a
            href={getSitesWhatsAppUrl(WHATSAPP_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 rounded-full bg-white px-7 py-3 text-sm font-medium text-brand-dark transition-colors hover:bg-white/90 sm:px-8 sm:py-3.5 sm:text-base"
          >
            Falar com o time comercial
          </a>
        </div>
      </div>
    </section>
  );
}
