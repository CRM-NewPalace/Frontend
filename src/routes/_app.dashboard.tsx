import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useCatalog } from "@/lib/catalog-store";
import {
  fetchDashboardCorretor,
  type DashboardCorretor,
} from "@/lib/dashboard-api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  BriefcaseBusiness,
  ClipboardList,
  FileCheck2,
  Loader2,
  TrendingUp,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import { SemConexao } from "@/components/sem-conexao";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NP Connect" }] }),
  component: Page,
});

const ANALISE_LABELS = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovada",
  reprovado: "Reprovada",
} as const;

const chartConfig = {
  total: { label: "Processos", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function Page() {
  const user = getSession();

  if (user?.role !== "corretor") {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="O primeiro painel está sendo desenvolvido para corretores."
        />
        <SemConexao
          title="Dashboard em preparação"
          description="Os indicadores gerenciais serão adicionados após a primeira versão do painel do corretor."
        />
      </div>
    );
  }

  return <DashboardCorretor />;
}

function DashboardCorretor() {
  const { funnelStages } = useCatalog();
  const [summary, setSummary] = useState<DashboardCorretor | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchDashboardCorretor());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os indicadores.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const funnelData = useMemo(() => {
    if (!summary) return [];
    const totals = new Map(
      summary.funil.map((item) => [item.etapa, item.total]),
    );
    return funnelStages.map((stage) => ({
      etapa: stage.name,
      total: totals.get(stage.id) ?? 0,
    }));
  }, [summary, funnelStages]);

  const analiseData = useMemo(
    () =>
      summary?.analises.map((item) => ({
        label: ANALISE_LABELS[item.status],
        total: item.total,
      })) ?? [],
    [summary],
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Visão geral da sua operação." />
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando indicadores…
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Visão geral da sua operação." />
        <SemConexao
          title="Indicadores indisponíveis"
          description="Não foi possível carregar os dados do dashboard."
        />
      </div>
    );
  }

  const emAnalise =
    summary.funil.find((item) => item.etapa === "em-analise")?.total ?? 0;
  const mes = new Date(summary.periodo.inicio).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Visão da sua carteira em ${mes}.`}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Leads ativos"
          value={summary.carteira.leads}
          icon={UsersRound}
          tone="teal"
          format="number"
          href="/leads"
        />
        <FinanceKpiCard
          label="Clientes na carteira"
          value={summary.carteira.clientes}
          icon={UserRound}
          tone="blue"
          format="number"
          href="/clientes"
        />
        <FinanceKpiCard
          label="Novos contatos no mês"
          value={summary.carteira.novosContatos}
          icon={TrendingUp}
          tone="orange"
          format="number"
        />
        <FinanceKpiCard
          label="Em análise"
          value={emAnalise}
          icon={ClipboardList}
          tone="violet"
          format="number"
          href="/funil"
        />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil atual</CardTitle>
            <p className="text-sm text-muted-foreground">
              {summary.conversaoEmAnalise}% da carteira está em análise.
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="etapa"
                  type="category"
                  width={112}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4}>
                  <LabelList dataKey="total" position="right" />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status das análises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analiseData.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="font-semibold tabular-nums">{item.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Documentações registradas"
          value={summary.documentacao.registrados}
          icon={BriefcaseBusiness}
          tone="blue"
          format="number"
          href="/documentacao"
        />
        <FinanceKpiCard
          label="Em andamento"
          value={summary.documentacao.emAndamento}
          icon={FileCheck2}
          tone="orange"
          format="number"
          href="/documentacao"
        />
        <FinanceKpiCard
          label="Vendas registradas"
          value={summary.documentacao.vendidos}
          icon={FileCheck2}
          tone="emerald"
          format="number"
          href="/documentacao"
        />
        <FinanceKpiCard
          label="VGV vendido no mês"
          value={summary.documentacao.vgvVendidoMes}
          icon={Wallet}
          tone="teal"
        />
      </section>
    </div>
  );
}
