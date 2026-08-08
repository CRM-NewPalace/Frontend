import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ChatMockup } from "@/marketing/whatsapp-ai";

export function WhatsAppAiSection() {
  return (
    <section className="bg-white px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-4 lg:max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            IA para WhatsApp
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Cada conversa vira uma oportunidade de negócio.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Nossa inteligência artificial conversa com o cliente, entende o que
            ele procura, captura os dados e entrega tudo pronto dentro do
            sistema — sem intervenção manual.
          </p>
          <Link
            to="/produtos/ia-whatsapp"
            className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-dark transition-all hover:gap-2.5 hover:text-brand-accent sm:text-base"
          >
            Saiba mais
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ChatMockup />
        </div>
      </div>
    </section>
  );
}
