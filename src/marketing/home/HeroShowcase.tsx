import { Check } from "lucide-react";

function CheckDot() {
  return (
    <span
      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-accent/15 text-brand-accent"
      aria-hidden
    >
      <Check size={12} strokeWidth={3} />
    </span>
  );
}

export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="relative min-h-[420px] sm:min-h-[460px] lg:min-h-[520px]">
        <div
          className="absolute inset-x-6 inset-y-8 rounded-[2rem] bg-linear-to-br from-brand-dark via-brand-dark to-brand-accent/80 shadow-xl sm:inset-x-10 sm:inset-y-6"
          aria-hidden
        />
        <div
          className="absolute inset-x-10 top-4 bottom-16 rounded-[1.75rem] bg-white/10 ring-1 ring-white/20 sm:inset-x-16"
          aria-hidden
        />

        <article className="absolute top-0 left-0 z-20 w-[min(100%,18.5rem)] rounded-2xl border border-black/5 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(5,54,71,0.45)] sm:w-72">
          <p className="text-[11px] font-semibold tracking-wide text-brand-accent uppercase">
            Funil comercial
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-dark">
            Leads em acompanhamento
          </p>
          <ul className="mt-3 space-y-2">
            {[
              ["Novo lead", "12"],
              ["Qualificação", "7"],
              ["Em análise", "4"],
            ].map(([label, value]) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/50 px-3 py-2"
              >
                <span className="border-l-2 border-brand-accent pl-2 text-xs text-text-muted">
                  {label}
                </span>
                <span className="text-sm font-semibold text-brand-dark">
                  {value}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="absolute top-28 right-0 z-30 w-[min(100%,17.5rem)] rounded-2xl border border-black/5 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(5,54,71,0.45)] sm:top-24 sm:w-64">
          <p className="text-[11px] font-semibold tracking-wide text-brand-accent uppercase">
            Gestão financeira
          </p>
          <ul className="mt-3 space-y-2">
            {[
              ["Comissões", "Em dia"],
              ["Receita do mês", "R$ 128 mil"],
              ["Pendente", "3 títulos"],
            ].map(([label, value]) => (
              <li
                key={label}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <span className="border-l-2 border-brand-dark pl-2 text-xs font-medium text-brand-dark">
                  {label}
                </span>
                <span className="text-xs text-text-muted">{value}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="absolute bottom-0 left-4 z-20 w-[min(calc(100%-1rem),20rem)] rounded-2xl border border-black/5 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(5,54,71,0.45)] sm:left-8 sm:w-80">
          <p className="text-[11px] font-semibold tracking-wide text-brand-accent uppercase">
            IA no WhatsApp
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-dark">
            Atendimento que registra no CRM
          </p>
          <ul className="mt-3 space-y-2">
            {[
              "Qualifica o interesse na conversa",
              "Captura dados sem retrabalho",
              "Entrega o lead no funil da equipe",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs leading-snug text-text-muted"
              >
                <CheckDot />
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
