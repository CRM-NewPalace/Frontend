import {
  HiBuildingLibrary,
  HiChartBarSquare,
  HiShieldCheck,
  HiUserGroup,
} from "react-icons/hi2";

const POINTS = [
  {
    icon: HiShieldCheck,
    title: "Credibilidade da marca",
    text: "O cliente pesquisa a imobiliária antes de agendar visita. Um site profissional transmite seriedade, organização e confiança.",
  },
  {
    icon: HiBuildingLibrary,
    title: "Canal próprio de captação",
    text: "Em vez de depender só de portais e redes sociais, a imobiliária tem um endereço próprio para receber buscas e campanhas.",
  },
  {
    icon: HiUserGroup,
    title: "Vitrine da equipe e dos imóveis",
    text: "Apresente a imobiliária, os corretores, diferenciais e o portfólio em um só lugar — fácil de compartilhar e atualizar.",
  },
  {
    icon: HiChartBarSquare,
    title: "Base para crescimento",
    text: "Com site institucional, fica mais simples rodar anúncios, medir resultados e integrar leads ao CRM da operação.",
  },
] as const;

export function InstitutionalSection() {
  return (
    <section className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-12">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Site institucional
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Por que a imobiliária precisa de um site institucional.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            No mercado imobiliário, a decisão de compra e locação envolve
            valores altos e muita pesquisa. Sem um site próprio, a imobiliária
            perde autoridade, deixa de aparecer nas buscas e depende de
            canais que não controla.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/10">
                <Icon className="h-5 w-5 text-brand-accent" />
              </div>
              <h3 className="text-lg font-semibold text-brand-dark">{title}</h3>
              <p className="text-sm leading-relaxed text-text-muted sm:text-base">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
