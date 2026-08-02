import { HiCpuChip } from 'react-icons/hi2'

const MESSAGES = [
  {
    side: 'left' as const,
    text: 'Oi! Vi um apartamento no site, ainda está disponível?',
  },
  {
    side: 'right' as const,
    text: 'Está sim! Você procura na mesma região? Posso te mostrar opções de 2 e 3 quartos.',
  },
  {
    side: 'left' as const,
    text: 'Perfeito, 3 quartos até R$ 650 mil.',
  },
]

function ChatMockup() {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-border bg-white p-5 shadow-md sm:px-6">
      {/* Header */}
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

      {/* Mensagens */}
      <div className="flex flex-col gap-3 py-5">
        {MESSAGES.map((message) => (
          <div
            key={message.text}
            className={`flex ${message.side === 'right' ? 'justify-end' : 'justify-start'}`}
          >
            <p
              className={
                message.side === 'right'
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-brand-dark px-4 py-2.5 text-sm leading-relaxed text-white'
                  : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-brand-accent/10 px-4 py-2.5 text-sm leading-relaxed text-text-muted'
              }
            >
              {message.text}
            </p>
          </div>
        ))}
      </div>

      {/* Badge */}
      <div className="pt-1">
        <span className="inline-flex rounded-full border border-dashed border-brand-accent px-3 py-1.5 text-xs font-medium text-brand-accent sm:text-sm">
          Lead criado e enviado ao CRM
        </span>
      </div>
    </div>
  )
}

export function WhatsAppAiSection() {
  return (
    <section className="bg-white px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Texto — esquerda no desktop */}
        <div className="flex flex-col gap-4 lg:max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            IA para WhatsApp
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Cada conversa vira uma oportunidade de negócio.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Nossa inteligência artificial conversa com o cliente, entende o que ele
            procura, captura os dados e entrega tudo pronto dentro do sistema — sem
            intervenção manual.
          </p>
        </div>

        {/* Card — direita no desktop */}
        <div className="flex justify-center lg:justify-end">
          <ChatMockup />
        </div>
      </div>
    </section>
  )
}
