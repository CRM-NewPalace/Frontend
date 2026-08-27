import type { ReactNode } from "react";
import {
  Bath,
  BedDouble,
  Building2,
  Car,
  DoorOpen,
  Expand,
  Layers,
  ShowerHead,
  CircleCheck,
} from "lucide-react";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  splitComodidadesCondominio,
  type CaptacaoImovelTipo,
} from "@/lib/captacao-api";

export type ImovelVisaoData = {
  tipo: string;
  tipoEmpreendimento?: string | null;
  area?: number | null;
  areaConstruida?: number | null;
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  aptsPorAndar?: number | null;
  andares?: number | null;
  torres?: number | null;
  comodidadesUnidade?: string[] | null;
  comodidadesCondominio?: string[] | null;
  fotoUrl?: string | null;
};

function formatM2(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}m²`;
}

function formatNum(value: number | null | undefined) {
  if (value == null) return "—";
  return String(value);
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function FeatureRow({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="flex flex-wrap gap-x-8 gap-y-2.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-2 text-sm text-foreground"
          >
            <CircleCheck className="h-4 w-4 shrink-0 text-primary" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ImovelFichaVisao({ imovel }: { imovel: ImovelVisaoData }) {
  const areaExibida = imovel.areaConstruida ?? imovel.area;
  const tipoEmpreendimento =
    imovel.tipoEmpreendimento?.trim() ||
    CAPTACAO_IMOVEL_TIPO_LABEL[imovel.tipo as CaptacaoImovelTipo] ||
    imovel.tipo;
  const { diferenciais, infra } = splitComodidadesCondominio(
    imovel.comodidadesCondominio,
  );
  const detalhes = imovel.comodidadesUnidade ?? [];
  const temCondominio =
    Boolean(imovel.tipoEmpreendimento?.trim()) ||
    imovel.aptsPorAndar != null ||
    imovel.andares != null ||
    imovel.torres != null;
  const temCaracteristicas =
    diferenciais.length > 0 || infra.length > 0 || detalhes.length > 0;

  return (
    <div className="space-y-10">
      {imovel.fotoUrl ? (
        <img
          src={imovel.fotoUrl}
          alt=""
          className="max-h-72 w-full rounded-xl object-cover"
        />
      ) : null}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-primary">
            Visão geral do Imóvel
          </h3>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              icon={<BedDouble className="h-5 w-5" />}
              label="Quartos"
              value={formatNum(imovel.quartos)}
            />
            <Stat
              icon={<Bath className="h-5 w-5" />}
              label="Suítes"
              value={formatNum(imovel.suites)}
            />
            <Stat
              icon={<Expand className="h-5 w-5" />}
              label="Área construída"
              value={formatM2(areaExibida)}
            />
            <Stat
              icon={<Building2 className="h-5 w-5" />}
              label="Tipo"
              value={tipoEmpreendimento}
            />
            <Stat
              icon={<ShowerHead className="h-5 w-5" />}
              label="Banheiros sociais"
              value={formatNum(imovel.banheiros)}
            />
            <Stat
              icon={<Car className="h-5 w-5" />}
              label="Vagas"
              value={formatNum(imovel.vagas)}
            />
          </div>
        </div>
        {temCondominio ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-primary">
              Visão geral do condomínio
            </h3>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                icon={<DoorOpen className="h-5 w-5" />}
                label="Apts. por andar"
                value={formatNum(imovel.aptsPorAndar)}
              />
              <Stat
                icon={<Layers className="h-5 w-5" />}
                label="Andares"
                value={formatNum(imovel.andares)}
              />
              <Stat
                icon={<Building2 className="h-5 w-5" />}
                label="Torres"
                value={formatNum(imovel.torres)}
              />
            </div>
          </div>
        ) : null}
      </section>

      {temCaracteristicas ? (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Características</h2>
          <FeatureRow
            title="Características e Diferenciais"
            items={diferenciais}
          />
          <FeatureRow title="Localização e Infraestrutura" items={infra} />
          <FeatureRow title="Detalhes do Imóvel" items={detalhes} />
        </section>
      ) : null}
    </div>
  );
}
