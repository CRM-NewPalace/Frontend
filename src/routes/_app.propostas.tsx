import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { MockBanner } from "@/components/financeiro-filtros";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MOCK_PROPOSTAS,
  PROPOSTA_STATUS_LABEL,
  brl,
  formatDate,
  propostaStatusClass,
  type Proposta,
  type PropostaStatus,
} from "@/lib/propostas-mock";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Handshake,
  Plus,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Zone Connection" }] }),
  component: Page,
});

const STATUS_OPTIONS: { value: PropostaStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "negociacao", label: "Em negociação" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
  { value: "expirada", label: "Expirada" },
];

function Page() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PropostaStatus | "todos">("todos");
  const [corretor, setCorretor] = useState("todos");
  const [equipe, setEquipe] = useState("todos");
  const [selected, setSelected] = useState<Proposta | null>(null);

  const corretorOptions = useMemo(() => {
    const set = new Set(MOCK_PROPOSTAS.map((p) => p.corretor));
    return [
      { value: "todos", label: "Todos os corretores" },
      ...[...set].sort().map((c) => ({ value: c, label: c })),
    ];
  }, []);

  const equipeOptions = useMemo(() => {
    const set = new Set(MOCK_PROPOSTAS.map((p) => p.equipe));
    return [
      { value: "todos", label: "Todas as equipes" },
      ...[...set].sort().map((e) => ({ value: e, label: e })),
    ];
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PROPOSTAS.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (corretor !== "todos" && p.corretor !== corretor) return false;
      if (equipe !== "todos" && p.equipe !== equipe) return false;
      if (!q) return true;
      return (
        p.codigo.toLowerCase().includes(q) ||
        p.cliente.toLowerCase().includes(q) ||
        p.empreendimento.toLowerCase().includes(q) ||
        p.construtora.toLowerCase().includes(q) ||
        p.unidade.toLowerCase().includes(q) ||
        p.corretor.toLowerCase().includes(q)
      );
    });
  }, [search, status, corretor, equipe]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const valor = rows.reduce((s, r) => s + r.valor, 0);
    const aceitas = rows.filter((r) => r.status === "aceita");
    const emAberto = rows.filter((r) =>
      ["enviada", "negociacao", "rascunho"].includes(r.status),
    );
    const taxaAceite =
      total > 0
        ? (aceitas.length /
            Math.max(
              rows.filter((r) =>
                ["aceita", "recusada", "expirada"].includes(r.status),
              ).length,
              1,
            )) *
          100
        : 0;
    return {
      total,
      valor,
      aceitas: aceitas.length,
      valorAceitas: aceitas.reduce((s, r) => s + r.valor, 0),
      emAberto: emAberto.length,
      taxaAceite,
    };
  }, [rows]);

  const hasActive = Boolean(
    search || status !== "todos" || corretor !== "todos" || equipe !== "todos",
  );

  return (
    <div>
      <PageHeader
        title="Propostas"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Propostas comerciais enviadas aos clientes
            <MockBanner />
          </span>
        }
        actions={
          <Button
            onClick={() =>
              toast.message("Dados demonstrativos", {
                description:
                  "Criação de propostas reais estará disponível com a API.",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova proposta
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Propostas (filtro)"
          value={kpis.total}
          icon={FileText}
          tone="blue"
          format="number"
        />
        <FinanceKpiCard
          label="VGV das propostas"
          value={kpis.valor}
          icon={Handshake}
          tone="violet"
        />
        <FinanceKpiCard
          label="Aceitas"
          value={kpis.aceitas}
          icon={CheckCircle2}
          tone="emerald"
          format="number"
          suffix={kpis.valorAceitas ? `· ${brl(kpis.valorAceitas)}` : undefined}
        />
        <FinanceKpiCard
          label="Em aberto"
          value={kpis.emAberto}
          icon={Clock3}
          tone="orange"
          format="number"
          suffix={`· ${kpis.taxaAceite.toFixed(0)}% aceite`}
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, cliente, empreendimento…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as PropostaStatus | "todos")}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={corretor} onValueChange={setCorretor}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Corretor" />
          </SelectTrigger>
          <SelectContent>
            {corretorOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={equipe} onValueChange={setEquipe}>
          <SelectTrigger className="w-full sm:w-[170px]">
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
        {hasActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatus("todos");
              setCorretor("todos");
              setEquipe("todos");
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhuma proposta para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {p.codigo}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.cliente}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.telefone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{p.empreendimento}</div>
                    <div className="text-xs text-muted-foreground">
                      Un. {p.unidade} · {p.construtora}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{p.corretor}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.equipe}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(p.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={propostaStatusClass(p.status)}
                    >
                      {PROPOSTA_STATUS_LABEL[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatDate(p.validade)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} de {MOCK_PROPOSTAS.length} propostas
      </p>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {selected.codigo}
                  <Badge
                    variant="outline"
                    className={propostaStatusClass(selected.status)}
                  >
                    {PROPOSTA_STATUS_LABEL[selected.status]}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Detalhes da proposta comercial (dados demonstrativos).
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 text-sm">
                <DetailRow label="Cliente" value={selected.cliente} />
                <DetailRow label="Telefone" value={selected.telefone} />
                <DetailRow
                  label="Empreendimento"
                  value={`${selected.empreendimento} · Un. ${selected.unidade}`}
                />
                <DetailRow label="Construtora" value={selected.construtora} />
                <DetailRow
                  label="Corretor"
                  value={`${selected.corretor} · ${selected.equipe}`}
                />
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 p-3 bg-muted/30">
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      Valor
                    </div>
                    <div className="font-semibold tabular-nums">
                      {brl(selected.valor)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      Entrada
                    </div>
                    <div className="font-semibold tabular-nums">
                      {brl(selected.entrada)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      Financiamento
                    </div>
                    <div className="font-semibold tabular-nums">
                      {brl(selected.financiamento)}
                    </div>
                  </div>
                </div>
                <DetailRow
                  label="Criada em"
                  value={formatDate(selected.criadaEm)}
                />
                <DetailRow
                  label="Enviada em"
                  value={
                    selected.enviadaEm
                      ? formatDate(selected.enviadaEm)
                      : "Ainda não enviada"
                  }
                />
                <DetailRow
                  label="Validade"
                  value={formatDate(selected.validade)}
                />
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">
                    Observação
                  </div>
                  <p className="text-foreground">{selected.observacao}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {selected.status === "rascunho" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      toast.message("Dados demonstrativos", {
                        description: "Envio real estará disponível com a API.",
                      })
                    }
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Enviar proposta
                  </Button>
                )}
                {(selected.status === "enviada" ||
                  selected.status === "negociacao") && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        toast.success("Simulação: proposta marcada como aceita")
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toast.message("Simulação: proposta recusada")
                      }
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(null)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
