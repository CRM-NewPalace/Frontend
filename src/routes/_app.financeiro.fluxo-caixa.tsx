import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import {
  fetchFluxoCaixa,
  fetchFluxoCaixaItens,
} from "@/lib/financeiro-api";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  brl,
  FLUXO_GRANULARIDADE_OPTIONS,
  formatDate,
  type FluxoBucket,
  type FluxoGranularidade,
  type FluxoItem,
} from "@/lib/financeiro-mock";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Table2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/financeiro/fluxo-caixa")({
  head: () => ({ meta: [{ title: "Fluxo de caixa — Zone Connection" }] }),
  component: Page,
});

const fluxoConfig = {
  entradasRealizadas: { label: "Entradas realizadas", color: "hsl(160 84% 39%)" },
  entradasPrevistas: { label: "Entradas previstas", color: "hsl(160 60% 55%)" },
  saidasRealizadas: { label: "Saídas realizadas", color: "hsl(0 72% 51%)" },
  saidasPrevistas: { label: "Saídas previstas", color: "hsl(0 55% 65%)" },
  saldoProjetado: { label: "Saldo projetado", color: "hsl(199 89% 48%)" },
  saldoRealizado: { label: "Saldo realizado", color: "hsl(215 70% 50%)" },
} satisfies ChartConfig;

type Visao = "tabela" | "calendario";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function startOfQuarter(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const qStart = Math.floor((m - 1) / 3) * 3 + 1;
  return `${y}-${String(qStart).padStart(2, "0")}-01`;
}

function endOfQuarter(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const qEnd = Math.floor((m - 1) / 3) * 3 + 3;
  return endOfMonth(`${y}-${String(qEnd).padStart(2, "0")}-01`);
}

function addMonths(iso: string, delta: number) {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function startOfWeek(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function rangeForGranularidade(
  anchor: string,
  g: FluxoGranularidade,
): { from: string; to: string; label: string } {
  if (g === "dia") {
    return { from: anchor, to: anchor, label: formatDate(anchor) };
  }
  if (g === "semana") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    return {
      from,
      to,
      label: `${formatDate(from)} – ${formatDate(to)}`,
    };
  }
  if (g === "mes") {
    const from = startOfMonth(anchor);
    const to = endOfMonth(anchor);
    const [y, m] = from.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return { from, to, label };
  }
  const from = startOfQuarter(anchor);
  const to = endOfQuarter(anchor);
  const q = Math.floor((Number(from.slice(5, 7)) - 1) / 3) + 1;
  return { from, to, label: `${from.slice(0, 4)} · T${q}` };
}

function shiftAnchor(anchor: string, g: FluxoGranularidade, dir: -1 | 1) {
  if (g === "dia") return addDays(anchor, dir);
  if (g === "semana") return addDays(anchor, dir * 7);
  if (g === "mes") return addMonths(startOfMonth(anchor), dir);
  return addMonths(startOfQuarter(anchor), dir * 3);
}

function ResponsiveChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}

function Page() {
  const [granularidade, setGranularidade] =
    useState<FluxoGranularidade>("mes");
  const [visao, setVisao] = useState<Visao>("tabela");
  const [anchor, setAnchor] = useState(todayIso());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [items, setItems] = useState<FluxoBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{
    from: string;
    to: string;
    label: string;
  } | null>(null);
  const [detailItems, setDetailItems] = useState<FluxoItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const range = useMemo(() => {
    if (customFrom && customTo && customFrom <= customTo) {
      return {
        from: customFrom,
        to: customTo,
        label: `${formatDate(customFrom)} – ${formatDate(customTo)}`,
      };
    }
    return rangeForGranularidade(anchor, granularidade);
  }, [anchor, granularidade, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await fetchFluxoCaixa({
          from: range.from,
          to: range.to,
          granularidade,
        }),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o fluxo de caixa.",
      );
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, granularidade]);

  useEffect(() => {
    void load();
  }, [load]);

  const totais = useMemo(() => {
    const entradasRealizadas = items.reduce(
      (s, d) => s + d.entradasRealizadas,
      0,
    );
    const saidasRealizadas = items.reduce((s, d) => s + d.saidasRealizadas, 0);
    const entradasPrevistas = items.reduce(
      (s, d) => s + d.entradasPrevistas,
      0,
    );
    const saidasPrevistas = items.reduce((s, d) => s + d.saidasPrevistas, 0);
    const saldoProjetado = items.at(-1)?.saldoProjetado ?? 0;
    const saldoRealizado = items.at(-1)?.saldoRealizado ?? 0;
    return {
      entradasRealizadas,
      saidasRealizadas,
      entradasPrevistas,
      saidasPrevistas,
      liquido:
        entradasRealizadas +
        entradasPrevistas -
        (saidasRealizadas + saidasPrevistas),
      saldoProjetado,
      saldoRealizado,
    };
  }, [items]);

  const chartData = useMemo(
    () =>
      items.map((d) => ({
        ...d,
        eixo: d.label,
      })),
    [items],
  );

  const [calDays, setCalDays] = useState<FluxoBucket[]>([]);

  useEffect(() => {
    if (visao !== "calendario") return;
    const from = startOfMonth(range.from);
    const to = endOfMonth(range.to.length >= 7 ? range.to : range.from);
    // For trimestral calendar show whole quarter months; for others show month of anchor
    const calFrom =
      granularidade === "trimestre" ? startOfQuarter(anchor) : startOfMonth(anchor);
    const calTo =
      granularidade === "trimestre" ? endOfQuarter(anchor) : endOfMonth(anchor);
    void fetchFluxoCaixa({
      from: calFrom,
      to: calTo,
      granularidade: "dia",
    })
      .then(setCalDays)
      .catch(() => setCalDays([]));
    void from;
    void to;
  }, [visao, granularidade, anchor, range.from, range.to]);

  async function openDetail(from: string, to: string, label: string) {
    setDetail({ from, to, label });
    setDetailLoading(true);
    try {
      setDetailItems(await fetchFluxoCaixaItens({ from, to }));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os itens.",
      );
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  }

  const calendarMonths = useMemo(() => {
    if (granularidade === "trimestre") {
      const start = startOfQuarter(anchor);
      return [0, 1, 2].map((i) => addMonths(start, i));
    }
    return [startOfMonth(anchor)];
  }, [anchor, granularidade]);

  const calByDay = useMemo(() => {
    const map = new Map<string, FluxoBucket>();
    for (const d of calDays) map.set(d.chave, d);
    return map;
  }, [calDays]);

  return (
    <div>
      <PageHeader
        title="Fluxo de caixa"
        description="Entradas e saídas realizadas e previstas (títulos + movimentação)"
      />

      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Granularidade</Label>
          <Select
            value={granularidade}
            onValueChange={(v) => {
              setGranularidade(v as FluxoGranularidade);
              setCustomFrom("");
              setCustomTo("");
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLUXO_GRANULARIDADE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setAnchor((a) => shiftAnchor(a, granularidade, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-[160px] text-center text-sm font-medium px-2 capitalize">
            {range.label}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setAnchor((a) => shiftAnchor(a, granularidade, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAnchor(todayIso());
              setCustomFrom("");
              setCustomTo("");
            }}
          >
            Hoje
          </Button>
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input
              type="date"
              className="h-9 w-[150px]"
              value={customFrom || range.from}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input
              type="date"
              className="h-9 w-[150px]"
              value={customTo || range.to}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex rounded-lg border p-0.5 bg-muted/40">
          <Button
            type="button"
            size="sm"
            variant={visao === "tabela" ? "default" : "ghost"}
            className="h-8"
            onClick={() => setVisao("tabela")}
          >
            <Table2 className="w-3.5 h-3.5 mr-1" />
            Tabela
          </Button>
          <Button
            type="button"
            size="sm"
            variant={visao === "calendario" ? "default" : "ghost"}
            className="h-8"
            onClick={() => setVisao("calendario")}
          >
            <CalendarDays className="w-3.5 h-3.5 mr-1" />
            Calendário
          </Button>
        </div>
      </div>

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Entradas realizadas"
          value={totais.entradasRealizadas}
          icon={ArrowUpRight}
          tone="emerald"
        />
        <FinanceKpiCard
          label="Saídas realizadas"
          value={totais.saidasRealizadas}
          icon={ArrowDownRight}
          tone="red"
        />
        <FinanceKpiCard
          label="Previsto líquido"
          value={totais.entradasPrevistas - totais.saidasPrevistas}
          icon={ArrowUpRight}
          tone="blue"
        />
        <FinanceKpiCard
          label="Saldo projetado"
          value={totais.saldoProjetado}
          icon={Wallet}
          tone="teal"
        />
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Carregando…
        </div>
      ) : (
        <>
          <div className="grid gap-4 min-w-0 lg:grid-cols-2 mb-4">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Realizado × previsto
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {chartData.length === 0 ? (
                  <p className="flex h-70 items-center justify-center text-sm text-muted-foreground">
                    Sem dados no período.
                  </p>
                ) : (
                  <ResponsiveChartShell>
                    <ChartContainer
                      config={fluxoConfig}
                      className="aspect-auto! h-70 w-full min-w-120"
                    >
                      <BarChart
                        data={chartData}
                        margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="eixo"
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                          tick={{ fontSize: 11 }}
                          minTickGap={16}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            `${(Number(v) / 1000).toFixed(0)}k`
                          }
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => brl(Number(value))}
                            />
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="entradasRealizadas"
                          stackId="e"
                          fill="var(--color-entradasRealizadas)"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="entradasPrevistas"
                          stackId="e"
                          fill="var(--color-entradasPrevistas)"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="saidasRealizadas"
                          stackId="s"
                          fill="var(--color-saidasRealizadas)"
                        />
                        <Bar
                          dataKey="saidasPrevistas"
                          stackId="s"
                          fill="var(--color-saidasPrevistas)"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </ResponsiveChartShell>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Saldo acumulado</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {chartData.length === 0 ? (
                  <p className="flex h-70 items-center justify-center text-sm text-muted-foreground">
                    Sem dados no período.
                  </p>
                ) : (
                  <ResponsiveChartShell>
                    <ChartContainer
                      config={fluxoConfig}
                      className="aspect-auto! h-70 w-full min-w-120"
                    >
                      <AreaChart
                        data={chartData}
                        margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="eixo"
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                          tick={{ fontSize: 11 }}
                          minTickGap={16}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            `${(Number(v) / 1000).toFixed(0)}k`
                          }
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => brl(Number(value))}
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="saldoRealizado"
                          stroke="var(--color-saldoRealizado)"
                          fill="var(--color-saldoRealizado)"
                          fillOpacity={0.15}
                        />
                        <Area
                          type="monotone"
                          dataKey="saldoProjetado"
                          stroke="var(--color-saldoProjetado)"
                          fill="var(--color-saldoProjetado)"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </ResponsiveChartShell>
                )}
              </CardContent>
            </Card>
          </div>

          {visao === "tabela" ? (
            <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ent. real.</TableHead>
                    <TableHead className="text-right">Ent. prev.</TableHead>
                    <TableHead className="text-right">Saí. real.</TableHead>
                    <TableHead className="text-right">Saí. prev.</TableHead>
                    <TableHead className="text-right">Saldo real.</TableHead>
                    <TableHead className="text-right">Saldo proj.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-10"
                      >
                        Sem dados no período. Cadastre títulos ou movimentações.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((d) => (
                      <TableRow
                        key={d.chave}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          void openDetail(d.inicio, d.fim, d.label)
                        }
                      >
                        <TableCell className="font-medium">{d.label}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">
                          {d.entradasRealizadas
                            ? brl(d.entradasRealizadas)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600/70">
                          {d.entradasPrevistas
                            ? brl(d.entradasPrevistas)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {d.saidasRealizadas ? brl(d.saidasRealizadas) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive/70">
                          {d.saidasPrevistas ? brl(d.saidasPrevistas) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {brl(d.saldoRealizado)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {brl(d.saldoProjetado)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-4",
                calendarMonths.length > 1 ? "lg:grid-cols-3" : "grid-cols-1",
              )}
            >
              {calendarMonths.map((monthStart) => (
                <MonthCalendar
                  key={monthStart}
                  monthStart={monthStart}
                  byDay={calByDay}
                  highlightWeek={
                    granularidade === "semana"
                      ? startOfWeek(anchor)
                      : undefined
                  }
                  onDayClick={(iso) =>
                    void openDetail(iso, iso, formatDate(iso))
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<Wallet className="w-5 h-5" />}
        title={detail?.label ?? "Detalhe"}
        description="Lançamentos e títulos do período"
      >
        <FormDialogBody>
          {detailLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detailItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum item neste período.
            </p>
          ) : (
            <div className="space-y-2">
              {detailItems.map((it) => (
                <div
                  key={`${it.origem}-${it.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.descricao}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-1.5 mt-0.5">
                      <span>{formatDate(it.data)}</span>
                      {it.parceiro ? <span>· {it.parceiro}</span> : null}
                      <Badge variant="outline" className="text-[10px] h-4">
                        {it.origem}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] h-4",
                          it.natureza === "previsto" && "opacity-70",
                        )}
                      >
                        {it.natureza}
                      </Badge>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "tabular-nums font-semibold shrink-0",
                      it.tipo === "entrada"
                        ? "text-emerald-600"
                        : "text-destructive",
                    )}
                  >
                    {it.tipo === "entrada" ? "+" : "−"}
                    {brl(it.valor)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}

function MonthCalendar({
  monthStart,
  byDay,
  highlightWeek,
  onDayClick,
}: {
  monthStart: string;
  byDay: Map<string, FluxoBucket>;
  highlightWeek?: string;
  onDayClick: (iso: string) => void;
}) {
  const [y, m] = monthStart.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startPad = (first.getDay() + 6) % 7; // monday=0
  const title = first.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }

  const weekEnd = highlightWeek ? addDays(highlightWeek, 6) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base capitalize">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <div key={d} className="text-center py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, idx) => {
            if (!iso) return <div key={`e-${idx}`} />;
            const bucket = byDay.get(iso);
            const ent =
              (bucket?.entradasRealizadas ?? 0) +
              (bucket?.entradasPrevistas ?? 0);
            const sai =
              (bucket?.saidasRealizadas ?? 0) + (bucket?.saidasPrevistas ?? 0);
            const inWeek =
              highlightWeek &&
              weekEnd &&
              iso >= highlightWeek &&
              iso <= weekEnd;
            const dayNum = Number(iso.slice(8));
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onDayClick(iso)}
                className={cn(
                  "min-h-[64px] rounded-md border p-1 text-left transition-colors hover:bg-muted/60",
                  inWeek && "ring-1 ring-primary/50 bg-primary/5",
                  !bucket && "opacity-70",
                )}
              >
                <div className="text-[11px] font-medium">{dayNum}</div>
                {ent > 0 ? (
                  <div className="text-[9px] text-emerald-600 truncate">
                    +{brl(ent)}
                  </div>
                ) : null}
                {sai > 0 ? (
                  <div className="text-[9px] text-destructive truncate">
                    −{brl(sai)}
                  </div>
                ) : null}
                {bucket &&
                (bucket.entradasPrevistas > 0 ||
                  bucket.saidasPrevistas > 0) ? (
                  <div className="text-[8px] text-muted-foreground">prev.</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
