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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOCK_COMISSOES,
  brl,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import { Banknote, CheckCircle2, Clock3, Percent, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/comissao")({
  head: () => ({ meta: [{ title: "Comissão — Zone Connection" }] }),
  component: Page,
});

const STATUS_COMISSAO = [
  { value: "todos", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "liberada", label: "Liberada" },
  { value: "paga", label: "Paga" },
];

function Page() {
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [status, setStatus] = useState("todos");
  const [equipe, setEquipe] = useState("todos");

  const equipeOptions = useMemo(() => {
    const set = new Set(MOCK_COMISSOES.map((c) => c.equipe));
    return [
      { value: "todos", label: "Todas as equipes" },
      ...[...set].sort().map((e) => ({ value: e, label: e })),
    ];
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date(2026, 6, 31);
    return MOCK_COMISSOES.filter((c) => {
      if (status !== "todos" && c.status !== status) return false;
      if (equipe !== "todos" && c.equipe !== equipe) return false;
      if (periodo !== "tudo") {
        const d = new Date(c.dataVenda + "T12:00:00");
        if (periodo === "mes") {
          if (!(
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          ))
            return false;
        } else if (periodo === "trimestre") {
          if (!(
            Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) &&
            d.getFullYear() === now.getFullYear()
          ))
            return false;
        } else if (periodo === "ano") {
          if (d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      if (!q) return true;
      return (
        c.corretor.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q) ||
        c.empreendimento.toLowerCase().includes(q)
      );
    });
  }, [search, periodo, status, equipe]);

  const kpis = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.valor, 0);
    const pendente = rows
      .filter((r) => r.status === "pendente")
      .reduce((s, r) => s + r.valor, 0);
    const liberada = rows
      .filter((r) => r.status === "liberada")
      .reduce((s, r) => s + r.valor, 0);
    const paga = rows
      .filter((r) => r.status === "paga")
      .reduce((s, r) => s + r.valor, 0);
    const vgv = rows.reduce((s, r) => s + r.vgv, 0);
    return { total, pendente, liberada, paga, vgv };
  }, [rows]);

  const hasActive = Boolean(
    search || periodo !== "mes" || status !== "todos" || equipe !== "todos",
  );

  return (
    <div>
      <PageHeader
        title="Comissão"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Comissões de corretores por venda
            <MockBanner />
          </span>
        }
        actions={
          <Button
            onClick={() =>
              toast.message("Dados demonstrativos", {
                description: "Liberação real estará disponível com a API.",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Lançar comissão
          </Button>
        }
      />

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Total comissões"
          value={kpis.total}
          icon={Percent}
          tone="violet"
        />
        <FinanceKpiCard
          label="Pendentes"
          value={kpis.pendente}
          icon={Clock3}
          tone="orange"
        />
        <FinanceKpiCard
          label="Liberadas"
          value={kpis.liberada}
          icon={Banknote}
          tone="blue"
        />
        <FinanceKpiCard
          label="Pagas"
          value={kpis.paga}
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar corretor, cliente, empreendimento…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        tipo={status}
        onTipoChange={setStatus}
        tipoOptions={STATUS_COMISSAO}
        extra={
          <Select value={equipe} onValueChange={setEquipe}>
            <SelectTrigger className="w-full sm:w-45">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              {equipeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
          setStatus("todos");
          setEquipe("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Corretor</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">VGV</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhuma comissão para os filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.corretor}</TableCell>
                  <TableCell>{c.equipe}</TableCell>
                  <TableCell>{c.empreendimento}</TableCell>
                  <TableCell>{c.cliente}</TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatDate(c.dataVenda)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.vgv ? brl(c.vgv) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.percentual
                      ? `${c.percentual.toLocaleString("pt-BR")}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(c.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(c.status)}
                    >
                      {statusLabel(c.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        VGV filtrado: {brl(kpis.vgv)} · {rows.length} comissão(ões)
      </p>
    </div>
  );
}
