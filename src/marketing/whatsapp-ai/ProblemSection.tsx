import {
  HiClock,
  HiExclamationTriangle,
  HiUserMinus,
} from "react-icons/hi2";

const PROBLEMS = [
  {
    icon: HiClock,
    title: "Resposta lenta",
    text: "O cliente manda mensagem fora do horário e, quando a equipe responde, já foi para outra imobiliária.",
  },
  {
    icon: HiUserMinus,
    title: "Leads sem dono",
    text: "Conversas ficam no celular do corretor. Ninguém sabe quem está atendendo, o que foi falado ou se o lead avançou.",
  },
  {
    icon: HiExclamationTriangle,
    title: "CRM incompleto",
    text: "Dados do WhatsApp não entram no sistema. O funil fica furado e a distribuição de oportunidades é manual.",
  },
] as const;

export function ProblemSection() {
  return (
    <section className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-12">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            O problema
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            O WhatsApp gera demanda — mas sem sistema, a imobiliária perde
            oportunidade.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Atendimento manual não escala. Enquanto a equipe digita, o lead
            esfria. Enquanto o lead não entra no CRM, ninguém consegue
            distribuir, medir ou acompanhar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {PROBLEMS.map(({ icon: Icon, title, text }) => (
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
