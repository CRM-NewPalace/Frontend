const STEPS = [
  {
    step: "01",
    title: "O cliente chama no WhatsApp",
    text: "A IA atende na hora, responde dúvidas e conduz a conversa com naturalidade — 24 horas por dia.",
  },
  {
    step: "02",
    title: "Entende o perfil e captura dados",
    text: "Tipo de imóvel, região, faixa de preço, contato e intenção de compra ou locação ficam registrados.",
  },
  {
    step: "03",
    title: "Cria o lead no CRM",
    text: "A conversa vira oportunidade no sistema, com histórico e contexto prontos para a equipe comercial.",
  },
  {
    step: "04",
    title: "Distribui para o corretor certo",
    text: "O lead é encaminhado conforme as regras da imobiliária — sem fila no grupo e sem briga por atendimento.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className="bg-white px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-12">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Como funciona
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Da mensagem ao corretor, em um fluxo contínuo.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            A IA não é um chatbot isolado: ela trabalha integrada ao CRM da Zone
            Connection para transformar atendimento em pipeline de vendas.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/60 p-5 sm:p-6"
            >
              <span className="text-sm font-semibold tracking-widest text-brand-accent">
                {item.step}
              </span>
              <h3 className="text-lg font-semibold text-brand-dark">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted sm:text-base">
                {item.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
