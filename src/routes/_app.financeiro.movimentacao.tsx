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
  MOCK_MOVIMENTOS,
  brl,
  filterByPeriodo,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type PeriodoFiltro,
  type StatusTitulo,
  type TipoMovimento,
} from "@/lib/financeiro-mock";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/movimentacao")({
  head: () => ({
    meta: [{ title: "Movimentação financeira — Zone Connection" }],
  }),
  component: Page,
});

const TIPO_OPTIONS = [
  { value: "todos", label: "Entradas e saídas" },
  { value: "entrada", label: "Entradas" },
  { value: "saida", label: "Saídas" },
];

function Page() {
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [status, setStatus] = useState<StatusTitulo | "todos">("todos");
  const [tipo, setTipo] = useState("todos");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filterByPeriodo(MOCK_MOVIMENTOS, periodo, "data").filter((m) => {
      if (status !== "todos" && m.status !== status) return false;
      if (tipo !== "todos" && m.tipo !== (tipo as TipoMovimento)) return false;
      if (!q) return true;
      return (
        m.descricao.toLowerCase().includes(q) ||
        m.parceiro.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q) ||
        m.centro.toLowerCase().includes(q)
      );
    });
  }, [search, periodo, status, tipo]);

  const totais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const m of rows) {
      if (m.tipo === "entrada") entradas += m.valor;
      else saidas += m.valor;
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  const hasActive = Boolean(
    search || periodo !== "mes" || status !== "todos" || tipo !== "todos",
  );

  return (
    <div>
      <PageHeader
        title="Movimentação financeira"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Lançamentos de entrada e saída
            <MockBanner />
          </span>
        }
        actions={
          <Button
            onClick={() =>
              toast.message("Dados demonstrativos", {
                description: "Novos lançamentos reais virão com a API.",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo lançamento
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Entradas filtradas"
          value={totais.entradas}
          icon={ArrowUpRight}
          tone="emerald"
        />
        <FinanceKpiCard
          label="Saídas filtradas"
          value={totais.saidas}
          icon={ArrowDownRight}
          tone="red"
        />
        <FinanceKpiCard
          label="Saldo do filtro"
          value={totais.saldo}
          icon={ArrowUpRight}
          tone="teal"
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar descrição, parceiro, categoria…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        status={status}
        onStatusChange={setStatus}
        tipo={tipo}
        onTipoChange={setTipo}
        tipoOptions={TIPO_OPTIONS}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
          setStatus("todos");
          setTipo("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum lançamento para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatDate(m.data)}
                  </TableCell>
                  <TableCell className="font-medium max-w-[240px]">
                    {m.descricao}
                  </TableCell>
                  <TableCell>{m.parceiro}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.categoria}
                  </TableCell>
                  <TableCell>{m.centro}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        m.tipo === "entrada"
                          ? "border-transparent bg-emerald-500/15 text-emerald-700"
                          : "border-transparent bg-destructive/15 text-destructive"
                      }
                    >
                      {m.tipo === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-semibold ${
                      m.tipo === "entrada"
                        ? "text-emerald-600"
                        : "text-destructive"
                    }`}
                  >
                    {m.tipo === "entrada" ? "+" : "−"}
                    {brl(m.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(m.status)}
                    >
                      {statusLabel(m.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} lançamento(s)
      </p>
    </div>
  );
}
