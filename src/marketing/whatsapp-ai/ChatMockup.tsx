import { HiCpuChip } from "react-icons/hi2";

const MESSAGES = [
  {
    side: "left" as const,
    text: "Oi! Vi um apartamento no site, ainda está disponível?",
  },
  {
    side: "right" as const,
    text: "Está sim! Você procura na mesma região? Posso te mostrar opções de 2 e 3 quartos.",
  },
  {
    side: "left" as const,
    text: "Perfeito, 3 quartos até R$ 650 mil.",
  },
  {
    side: "right" as const,
    text: "Ótimo! Vou te enviar 3 opções alinhadas e já registrar seu contato no CRM da imobiliária.",
  },
] as const;

export function ChatMockup() {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-border bg-white p-5 shadow-md sm:px-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/10">
          <HiCpuChip className="h-5 w-5 text-brand-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-dark sm:text-base">
            Assistente Zone
          </p>
          <p className="text-xs text-text-muted">online agora</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 py-5">
        {MESSAGES.map((message) => (
          <div
            key={message.text}
            className={`flex ${message.side === "right" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={
                message.side === "right"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand-dark px-4 py-2.5 text-sm leading-relaxed text-white"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-brand-accent/10 px-4 py-2.5 text-sm leading-relaxed text-text-muted"
              }
            >
              {message.text}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <span className="inline-flex rounded-full border border-dashed border-brand-accent px-3 py-1.5 text-xs font-medium text-brand-accent sm:text-sm">
          Lead criado no CRM
        </span>
        <span className="inline-flex rounded-full border border-dashed border-brand-dark/30 px-3 py-1.5 text-xs font-medium text-brand-dark/70 sm:text-sm">
          Distribuído para corretor
        </span>
      </div>
    </div>
  );
}
