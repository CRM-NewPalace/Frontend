import type { IconType } from "react-icons";
import {
  HiArrowRight,
  HiBuildingOffice2,
  HiChatBubbleLeftRight,
  HiCursorArrowRays,
  HiDocumentText,
  HiTableCells,
  HiUserGroup,
  HiWallet,
} from "react-icons/hi2";

const scatteredTools: { label: string; icon: IconType }[] = [
  { label: "CRM", icon: HiUserGroup },
  { label: "Financeiro", icon: HiWallet },
  { label: "WhatsApp", icon: HiChatBubbleLeftRight },
  { label: "Planilhas", icon: HiTableCells },
  { label: "Gestão de imóveis", icon: HiBuildingOffice2 },
  { label: "Documentos", icon: HiDocumentText },
  { label: "Leads", icon: HiCursorArrowRays },
];

const problemPoints = [
  "Retrabalho diário da equipe",
  "Informações perdidas entre setores",
  "Decisões sem dados confiáveis",
];

const solutionPoints = [
  "Operação centralizada",
  "Equipe integrada",
  "Decisão baseada em dados",
];

function ToolTag({ label, icon: Icon }: { label: string; icon: IconType }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-brand-dark sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-sm">
      <Icon className="h-4 w-4 shrink-0 text-text-muted" />
      {label}
    </span>
  );
}

function BulletList({
  items,
  dotClassName,
}: {
  items: string[];
  dotClassName: string;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-sm text-text-muted sm:text-base"
        >
          <span
            className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ProblemSection() {
  return (
    <section className="bg-surface-muted px-6 py-14 lg:px-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-12">
        {/* Cabeçalho */}
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            O problema
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Sua operação está espalhada em sistemas que não conversam entre si.
          </h2>
          <p className="text-base leading-relaxed text-text-muted sm:text-lg">
            Cada setor com uma ferramenta diferente. O resultado é retrabalho,
            perda de informação, dados desencontrados e produtividade baixa.
          </p>
        </div>

        {/* Comparação */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
          {/* HOJE */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-1 flex-col gap-6 rounded-2xl border border-dashed border-border bg-white/60 p-5 sm:p-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                Hoje - Um sistema para cada setor:
              </span>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
                {scatteredTools.map((tool) => (
                  <ToolTag key={tool.label} {...tool} />
                ))}
              </div>
              <BulletList items={problemPoints} dotClassName="bg-red-500" />
            </div>
          </div>

          {/* Seta central */}
          <div className="flex items-center justify-center lg:px-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark shadow-md sm:h-12 sm:w-12"
              aria-hidden
            >
              <HiArrowRight className="h-5 w-5 rotate-90 text-white lg:rotate-0" />
            </div>
          </div>

          {/* Solução */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div
              className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-brand-accent/10 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4">
              <h3 className="text-xl font-semibold text-brand-dark sm:text-2xl">
                Com Zone Connection - Uma única plataforma
              </h3>
              <p className="text-sm leading-relaxed text-text-muted sm:text-base">
                Todos os setores conectados no mesmo fluxo de dados, com
                histórico completo e automações que trabalham por você.
              </p>
              <BulletList
                items={solutionPoints}
                dotClassName="bg-brand-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
