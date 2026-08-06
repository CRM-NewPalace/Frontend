import { getWhatsAppUrl } from "@/lib/env";
import { ScrollReveal } from "./ScrollReveal";

export function CTASection() {
  return (
    <section
      id="contato"
      className="px-6 py-20 lg:px-12 lg:pt-28 lg:pb-32"
      aria-labelledby="cta-title"
    >
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <div
            className="relative overflow-hidden rounded-3xl px-7 py-12 text-center shadow-lg sm:px-12 sm:py-16"
            style={{
              background:
                "linear-gradient(145deg, #034055 0%, #023242 60%, #01232e 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute top-[-40%] left-1/2 h-4/5 w-3/5 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <div className="relative mx-auto max-w-2xl">
              <h2
                id="cta-title"
                className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2.35rem] lg:leading-tight"
              >
                Vamos construir o futuro do mercado imobiliário juntos?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
                Se a sua imobiliária busca tecnologia com propósito, clareza e
                conexão entre soluções, vamos conversar. Estamos prontos para
                evoluir com você.
              </p>
              <a
                href={getWhatsAppUrl(
                  "Olá! Gostaria de conhecer a Zone Connection.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-brand-dark transition-all hover:-translate-y-px hover:bg-surface-muted"
              >
                Fale conosco
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
