import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Table2, Wallet, ArrowUpRight, ArrowDownRight,
  CalendarPlus, Calculator, ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";
import {
  moneyBRL,
  useFinanceiroContas,
  isContaPendente,
  type ContaFinanceira,
} from "@/lib/financeiro-contas-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/financeiro/fluxo-caixa")({
  head: () => ({ meta: [{ title: "Fluxo de caixa — Financeiro" }] }),
  component: FluxoCaixa,
});

type ViewMode = "grade" | "calendario";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDayHeader(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const wd = WEEKDAYS[d.getDay()];
  return { day, wd };
}

function sumByDay(contas: ContaFinanceira[], day: string, tipo: ContaFinanceira["tipo"], pred?: (c: ContaFinanceira) => boolean) {
  return contas
    .filter((c) => c.tipo === tipo && c.vencimento === day && isContaPendente(c) && (!pred || pred(c)))
    .reduce((s, c) => s + c.valor, 0);
}

function FluxoCaixa() {
  const { contas, saldoInicial } = useFinanceiroContas();
  const [view, setView] = useState<ViewMode>("calendario");
  const [cursor, setCursor] = useState(() => new Date(2026, 6, 1)); // Jul/2026
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const totalDays = daysInMonth(year, month);

  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => toISODate(year, month, i + 1)),
    [year, month, totalDays],
  );

  const monthContas = useMemo(
    () => contas.filter((c) => c.vencimento.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)),
    [contas, year, month],
  );

  const totalAReceber = monthContas
    .filter((c) => c.tipo === "receber" && c.status !== "previsto" && isContaPendente(c))
    .reduce((s, c) => s + c.valor, 0);

  const previsaoEntrada = monthContas
    .filter((c) => c.tipo === "receber" && c.status === "previsto")
    .reduce((s, c) => s + c.valor, 0);

  const totalAPagar = monthContas
    .filter((c) => c.tipo === "pagar" && isContaPendente(c))
    .reduce((s, c) => s + c.valor, 0);

  const saldoProjetado = saldoInicial + totalAReceber + previsaoEntrada - totalAPagar;

  const dailyMap = useMemo(() => {
    const map = new Map<string, { receber: number; previsto: number; pagar: number }>();
    for (const day of days) {
      map.set(day, {
        receber: sumByDay(monthContas, day, "receber", (c) => c.status !== "previsto"),
        previsto: sumByDay(monthContas, day, "receber", (c) => c.status === "previsto"),
        pagar: sumByDay(monthContas, day, "pagar"),
      });
    }
    return map;
  }, [days, monthContas]);

  const acumulados = useMemo(() => {
    let acc = saldoInicial;
    const saldoDia: number[] = [];
    const saldoAcc: number[] = [];
    for (const day of days) {
      const d = dailyMap.get(day)!;
      const dia = d.receber + d.previsto - d.pagar;
      acc += dia;
      saldoDia.push(dia);
      saldoAcc.push(acc);
    }
    return { saldoDia, saldoAcc };
  }, [days, dailyMap, saldoInicial]);

  const agendaDays = useMemo(() => {
    return days
      .map((iso) => {
        const d = dailyMap.get(iso)!;
        const liquido = d.receber + d.previsto - d.pagar;
        const dayContas = monthContas.filter((c) => c.vencimento === iso && isContaPendente(c));
        return { iso, d, liquido, dayContas };
      })
      .filter((x) => x.dayContas.length > 0);
  }, [days, dailyMap, monthContas]);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const receberCount = monthContas.filter((c) => c.tipo === "receber" && isContaPendente(c)).length;
  const pagarCount = monthContas.filter((c) => c.tipo === "pagar" && isContaPendente(c)).length;

  function shiftMonth(delta: number) {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const calendarCells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...days,
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectedContas = selectedDay
    ? monthContas.filter((c) => c.vencimento === selectedDay && isContaPendente(c))
    : [];
  const selectedDaily = selectedDay ? dailyMap.get(selectedDay) : null;

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Fluxo de caixa"
        description="Projeção diária integrada com contas a pagar e a receber."
        actions={
          <>
            <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link to="/financeiro/contas-a-receber">
                <span className="sm:hidden">Receber</span>
                <span className="hidden sm:inline">Contas a receber</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link to="/financeiro/contas-a-pagar">
                <span className="sm:hidden">Pagar</span>
                <span className="hidden sm:inline">Contas a pagar</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
            <div className="flex rounded-lg border overflow-hidden w-full sm:w-auto">
              <Button
                size="sm"
                variant={view === "calendario" ? "default" : "ghost"}
                className="rounded-none h-8 flex-1 sm:flex-none"
                onClick={() => setView("calendario")}
              >
                <CalendarDays className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Calendário</span>
              </Button>
              <Button
                size="sm"
                variant={view === "grade" ? "default" : "ghost"}
                className="rounded-none h-8 flex-1 sm:flex-none"
                onClick={() => setView("grade")}
              >
                <Table2 className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Grade</span>
              </Button>
            </div>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 [&>*]:min-w-0">
        <FinanceKpiCard label="Saldo inicial" value={saldoInicial} icon={Wallet} tone="blue" />
        <FinanceKpiCard
          label="Total a receber"
          value={totalAReceber}
          icon={ArrowUpRight}
          tone="emerald"
          href="/financeiro/contas-a-receber"
        />
        <FinanceKpiCard label="Previsão de entrada" value={previsaoEntrada} icon={CalendarPlus} tone="violet" />
        <FinanceKpiCard
          label="Total a pagar"
          value={totalAPagar}
          icon={ArrowDownRight}
          tone="rose"
          href="/financeiro/contas-a-pagar"
        />
        <FinanceKpiCard
          label="Saldo projetado"
          value={saldoProjetado}
          icon={Calculator}
          tone="teal"
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-semibold capitalize flex-1 sm:flex-none sm:min-w-[160px] text-center">
            {monthLabel}
          </div>
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => shiftMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-center sm:text-right">
          {receberCount} a receber · {pagarCount} a pagar neste mês
        </div>
      </div>

      {view === "calendario" ? (
        <>
          {/* Mobile: agenda list */}
          <div className="md:hidden space-y-3">
            {agendaDays.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma conta pendente neste mês.
              </Card>
            ) : (
              agendaDays.map(({ iso, d, liquido, dayContas }) => {
                const date = new Date(iso + "T12:00:00");
                return (
                  <Card key={iso} className="p-3 sm:p-4 overflow-hidden">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold capitalize">
                          {date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {d.receber > 0 && <DayChip tone="emerald" label={`Receber ${moneyBRL(d.receber)}`} />}
                          {d.previsto > 0 && <DayChip tone="violet" label={`Previsto ${moneyBRL(d.previsto)}`} />}
                          {d.pagar > 0 && <DayChip tone="rose" label={`Pagar ${moneyBRL(d.pagar)}`} />}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-sm font-bold tabular-nums shrink-0",
                          liquido >= 0 ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {liquido >= 0 ? "+" : ""}
                        {moneyBRL(liquido)}
                      </div>
                    </div>
                    <ul className="space-y-2 border-t pt-3">
                      {dayContas.map((c) => (
                        <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.pessoa}</div>
                            <div className="text-xs text-muted-foreground truncate">{c.descricao}</div>
                          </div>
                          <div
                            className={cn(
                              "text-sm font-semibold tabular-nums shrink-0",
                              c.tipo === "receber" ? "text-emerald-700" : "text-rose-700",
                            )}
                          >
                            {c.tipo === "receber" ? "+" : "−"}
                            {moneyBRL(c.valor)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })
            )}
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground px-1">
              <LegendDot className="bg-emerald-500" label="Contas a receber" />
              <LegendDot className="bg-violet-500" label="Entrada prevista" />
              <LegendDot className="bg-rose-500" label="Contas a pagar" />
            </div>
          </div>

          {/* Desktop: calendar grid */}
          <Card className="hidden md:block overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {WEEKDAYS.map((w) => (
                <div key={w} className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
              {calendarCells.map((iso, idx) => {
                if (!iso) {
                  return <div key={`e-${idx}`} className="min-h-[100px] lg:min-h-[110px] border-b border-r bg-muted/20" />;
                }
                const d = dailyMap.get(iso)!;
                const dayNum = Number(iso.slice(-2));
                const hasAny = d.receber > 0 || d.previsto > 0 || d.pagar > 0;
                const liquido = d.receber + d.previsto - d.pagar;
                const dayContas = monthContas.filter((c) => c.vencimento === iso && isContaPendente(c));
                const isSelected = selectedDay === iso;

                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => setSelectedDay(isSelected ? null : iso)}
                    className={cn(
                      "min-h-[100px] lg:min-h-[110px] border-b border-r p-1.5 lg:p-2 flex flex-col gap-1 text-left transition-colors",
                      hasAny && "bg-card hover:bg-accent/30",
                      isSelected && "ring-2 ring-inset ring-primary bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <span
                        className={cn(
                          "text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                          hasAny ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {dayNum}
                      </span>
                      {hasAny && (
                        <span
                          className={cn(
                            "text-[9px] lg:text-[10px] font-semibold tabular-nums truncate",
                            liquido >= 0 ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {liquido >= 0 ? "+" : ""}
                          {moneyBRL(liquido)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 flex-1 overflow-hidden min-w-0">
                      {d.receber > 0 && (
                        <DayChip tone="emerald" label={`Receber ${moneyBRL(d.receber)}`} />
                      )}
                      {d.previsto > 0 && (
                        <DayChip tone="violet" label={`Previsto ${moneyBRL(d.previsto)}`} />
                      )}
                      {d.pagar > 0 && (
                        <DayChip tone="rose" label={`Pagar ${moneyBRL(d.pagar)}`} />
                      )}
                      {dayContas.slice(0, 2).map((c) => (
                        <div
                          key={c.id}
                          className="text-[10px] leading-tight text-muted-foreground truncate px-0.5 hidden lg:block"
                          title={`${c.pessoa} — ${c.descricao}`}
                        >
                          {c.tipo === "receber" ? "+" : "−"} {c.pessoa}
                        </div>
                      ))}
                      {dayContas.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1 hidden lg:block">
                          +{dayContas.length - 2} lançamentos
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <LegendDot className="bg-emerald-500" label="Contas a receber" />
              <LegendDot className="bg-violet-500" label="Entrada prevista" />
              <LegendDot className="bg-rose-500" label="Contas a pagar" />
            </div>
          </Card>

          {selectedDay && selectedDaily && (
            <Card className="hidden md:block p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold capitalize">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long", day: "2-digit", month: "long",
                  })}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedDay(null)}>Fechar</Button>
              </div>
              {selectedContas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem lançamentos neste dia.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedContas.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                      <div className="min-w-0">
                        <div className="font-medium">{c.pessoa}</div>
                        <div className="text-xs text-muted-foreground">{c.descricao}</div>
                      </div>
                      <div className={cn(
                        "font-semibold tabular-nums shrink-0",
                        c.tipo === "receber" ? "text-emerald-700" : "text-rose-700",
                      )}>
                        {c.tipo === "receber" ? "+" : "−"}{moneyBRL(c.valor)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-3 sm:px-4 py-2 border-b text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-1">
            <span>Centros × datas — role horizontalmente</span>
            <span className="hidden sm:inline">Integrado com contas a pagar / receber</span>
          </div>
          <div className="overflow-x-auto -mx-0">
            <table className="w-full border-collapse text-xs min-w-max">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/80 backdrop-blur px-3 py-2 text-left font-semibold min-w-[140px] border-b border-r">
                    Centro / categoria
                  </th>
                  {days.map((iso) => {
                    const { day, wd } = formatDayHeader(iso);
                    return (
                      <th key={iso} className="px-2 py-2 text-center font-medium border-b min-w-[68px]">
                        <div>{day}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{wd}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <SectionRow label="ENTRADAS" tone="emerald" cols={days.length} />
                <DataRow
                  label="A receber"
                  days={days}
                  getValue={(iso) => dailyMap.get(iso)!.receber}
                  tone="emerald"
                />
                <DataRow
                  label="Entrada prevista"
                  days={days}
                  getValue={(iso) => dailyMap.get(iso)!.previsto}
                  tone="violet"
                />
                <SectionRow label="SAÍDAS" tone="rose" cols={days.length} />
                <DataRow
                  label="Contas a pagar"
                  days={days}
                  getValue={(iso) => dailyMap.get(iso)!.pagar}
                  tone="rose"
                />
                <tr className="bg-muted/30 font-semibold">
                  <td className="sticky left-0 z-10 bg-muted/60 backdrop-blur px-3 py-2 border-t border-r">
                    Saldo do dia
                  </td>
                  {acumulados.saldoDia.map((v, i) => (
                    <td
                      key={days[i]}
                      className={cn(
                        "px-2 py-2 text-right tabular-nums border-t",
                        v > 0 && "text-emerald-600",
                        v < 0 && "text-rose-600",
                      )}
                    >
                      {v ? moneyBRL(v) : ""}
                    </td>
                  ))}
                </tr>
                <tr className="bg-primary/5 font-semibold">
                  <td className="sticky left-0 z-10 bg-primary/10 backdrop-blur px-3 py-2 border-t border-r">
                    Saldo acumulado
                  </td>
                  {acumulados.saldoAcc.map((v, i) => (
                    <td
                      key={days[i]}
                      className={cn(
                        "px-2 py-2 text-right tabular-nums border-t",
                        v >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
                      )}
                    >
                      {moneyBRL(v)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function DayChip({ tone, label }: { tone: "emerald" | "violet" | "rose"; label: string }) {
  return (
    <div
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate max-w-full",
        tone === "emerald" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        tone === "violet" && "bg-violet-500/15 text-violet-700 dark:text-violet-300",
        tone === "rose" && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
      )}
    >
      {label}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", className)} />
      {label}
    </span>
  );
}

function SectionRow({ label, tone, cols }: { label: string; tone: "emerald" | "rose"; cols: number }) {
  return (
    <tr>
      <td
        colSpan={cols + 1}
        className={cn(
          "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-t",
          tone === "emerald" && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
          tone === "rose" && "bg-rose-500/10 text-rose-800 dark:text-rose-300",
        )}
      >
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  label,
  days,
  getValue,
  tone,
}: {
  label: string;
  days: string[];
  getValue: (iso: string) => number;
  tone: "emerald" | "violet" | "rose";
}) {
  return (
    <tr className="hover:bg-muted/20">
      <td className="sticky left-0 z-10 bg-card px-3 py-2 border-r font-medium">
        <Badge
          variant="outline"
          className={cn(
            "font-normal",
            tone === "emerald" && "border-emerald-300 text-emerald-700",
            tone === "violet" && "border-violet-300 text-violet-700",
            tone === "rose" && "border-rose-300 text-rose-700",
          )}
        >
          {label}
        </Badge>
      </td>
      {days.map((iso) => {
        const v = getValue(iso);
        return (
          <td
            key={iso}
            className={cn(
              "px-2 py-2 text-right tabular-nums",
              v > 0 && tone === "emerald" && "text-emerald-700 dark:text-emerald-400",
              v > 0 && tone === "violet" && "text-violet-700 dark:text-violet-400",
              v > 0 && tone === "rose" && "text-rose-700 dark:text-rose-400",
            )}
          >
            {v ? moneyBRL(v) : ""}
          </td>
        );
      })}
    </tr>
  );
}
