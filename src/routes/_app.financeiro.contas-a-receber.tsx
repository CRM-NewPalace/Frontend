import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FinanceiroFiltrosBar,
  MockBanner,
} from "@/components/financeiro-filtros";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MOCK_A_RECEBER,
  brl,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type PeriodoFiltro,
  type StatusTitulo,
} from "@/lib/financeiro-mock";
import { AlertTriangle, CheckCircle2, Clock3, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/contas-a-receber")({
  head: () => ({ meta: [{ title: "Contas a receber — Zone Connection" }] }),
  component: Page,
});

function Page() {
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("tudo");
  const [status, setStatus] = useState<StatusTitulo | "todos">("todos");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date(2026, 6, 31);
    return MOCK_A_RECEBER.filter((t) => {
      if (status !== "todos" && t.status !== status) return false;
      if (periodo !== "tudo") {
        const d = new Date(t.vencimento + "T12:00:00");
        if (periodo === "mes") {
          if (
            !(
              d.getMonth() === now.getMonth() &&
              d.getFullYear() === now.getFullYear()
            )
          )
            return false;
        } else if (periodo === "trimestre") {
          if (
            !(
              Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) &&
              d.getFullYear() === now.getFullYear()
            )
          )
            return false;
        } else if (periodo === "ano") {
          if (d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      if (!q) return true;
      return (
        t.descricao.toLowerCase().includes(q) ||
        t.parceiro.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q)
      );
    });
  }, [search, periodo, status]);

  const kpis = useMemo(() => {
    const aberto = rows
      .filter((r) => r.status === "aberto")
      .reduce((s, r) => s + r.valor, 0);
    const atrasado = rows
      .filter((r) => r.status === "atrasado")
      .reduce((s, r) => s + r.valor, 0);
    const pago = rows
      .filter((r) => r.status === "pago")
      .reduce((s, r) => s + r.valor, 0);
    return { aberto, atrasado, pago, total: aberto + atrasado };
  }, [rows]);

  const hasActive = Boolean(
    search || periodo !== "tudo" || status !== "todos",
  );

  return (
    <div>
      <PageHeader
        title="Contas a receber"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Títulos a receber de construtoras e clientes
            <MockBanner />
          </span>
        }
        actions={
          <Button
            onClick={() =>
              toast.message("Dados demonstrativos", {
                description: "Inclusão real estará disponível com a API.",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo título
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Em aberto"
          value={kpis.aberto}
          icon={Clock3}
          tone="blue"
        />
        <FinanceKpiCard
          label="Atrasado"
          value={kpis.atrasado}
          icon={AlertTriangle}
          tone="red"
        />
        <FinanceKpiCard
          label="Recebido (filtro)"
          value={kpis.pago}
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar título, parceiro…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        status={status}
        onStatusChange={setStatus}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("tudo");
          setStatus("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum título encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium max-w-[260px]">
                    {t.descricao}
                  </TableCell>
                  <TableCell>{t.parceiro}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.categoria}
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatDate(t.vencimento)}
                  </TableCell>
                  <TableCell>{t.parcela}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(t.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(t.status)}
                    >
                      {statusLabel(t.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Total em aberto + atrasado: {brl(kpis.total)} · {rows.length} título(s)
      </p>
    </div>
  );
}
