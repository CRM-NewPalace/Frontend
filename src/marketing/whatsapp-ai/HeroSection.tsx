import { Link } from "@tanstack/react-router";
import { getWhatsAppUrl } from "@/lib/env";
import { ChatMockup } from "./ChatMockup";

const WHATSAPP_MSG =
  "Olá! Quero conhecer a IA de WhatsApp da Zone Connection.";

export function HeroSection() {
  return (
    <section className="bg-white px-6 pt-4 pb-10 lg:px-12 lg:pt-2 lg:pb-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-accent" />
            <span className="text-sm font-medium text-brand-dark">
              Zone Connection — IA para WhatsApp
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold leading-tight text-brand-dark sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Atendimento no WhatsApp que{" "}
              <span className="text-gradient-brand">
                captura e distribui leads
              </span>{" "}
              no CRM.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
              A inteligência artificial conversa com o cliente, entende o que
              ele procura, registra o lead no CRM e encaminha para o corretor
              certo — sem perder mensagem e sem digitação manual.
            </p>
          </div>

          <div className="flex flex-nowrap items-center gap-2 sm:gap-3">
            <a
              href={getWhatsAppUrl(WHATSAPP_MSG)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 whitespace-nowrap rounded-full bg-brand-dark px-3 py-2.5 text-center text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 sm:flex-none sm:px-7 sm:py-3 sm:text-base"
            >
              Quero automatizar o atendimento
            </a>
            <Link
              to="/produtos/crm-imobiliario"
              className="flex-1 whitespace-nowrap rounded-full border border-brand-dark px-3 py-2.5 text-center text-xs font-medium text-brand-dark transition-colors hover:bg-brand-dark/5 sm:flex-none sm:px-7 sm:py-2.5 sm:text-base"
            >
              Ver o CRM
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ChatMockup />
        </div>
      </div>
    </section>
  );
}
