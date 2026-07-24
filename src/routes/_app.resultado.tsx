import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { getSession } from "@/lib/mock-auth";
import { canViewTeamData } from "@/lib/permissions";
import { brl } from "@/lib/mock-data";
import {
  useDocumentacao,
  DOCUMENTACAO_STAGES,
  resultadoToStatus,
  statusLabel,
  resultadoLabel,
  type Documentacao,
  type DocumentacaoStatus,
  type ResultadoAnalise,
} from "@/lib/documentacao-store";
import {
  Search, LayoutList, Kanban, TrendingUp, TrendingDown, Minus,
  ClipboardCheck, User, Wallet, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/resultado")({
  head: () => ({ meta: [{ title: "Resultado — Imob CRM" }] }),
  beforeLoad: () => {
    const user = getSession();
    if (!user || !canViewTeamData(user.role)) {
      throw redirect({ to: "/documentacao" });
    }
  },
  component: ResultadoPage,
});
type ViewMode = "table" | "kanban";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function statusBadge(status: DocumentacaoStatus) {
  const stage = DOCUMENTACAO_STAGES.find((s) => s.id === status);
  return <Badge className={stage?.color}>{stage?.name ?? status}</Badge>;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function ResultadoPage() {
  const { documentacoes, updateDocumentacao, updateStatus } = useDocumentacao();

  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [corretorFilter, setCorretorFilter] = useState("all");

  const [dragging, setDragging] = useState<string | null>(null);
  const didDrag = useRef(false);

  const [selectedDoc, setSelectedDoc] = useState<Documentacao | null>(null);
  const [resultado, setResultado] = useState<Exclude<ResultadoAnalise, null>>("aprovado");
  const [observacao, setObservacao] = useState("");

  const corretores = useMemo(
    () => [...new Set(documentacoes.map((d) => d.corretor))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [documentacoes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documentacoes.filter((d) => {
      if (q && !`${d.nome} ${d.corretor}`.toLowerCase().includes(q)) return false;
      if (corretorFilter !== "all" && d.corretor !== corretorFilter) return false;
      return true;
    });
  }, [documentacoes, search, corretorFilter]);

  const metrics = useMemo(() => {
    const now = new Date();
    const thisKey = monthKey(now);
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = monthKey(last);

    let thisMonth = 0;
    let lastMonth = 0;
    for (const d of documentacoes) {
      const created = new Date(d.createdAt);
      const key = monthKey(created);
      if (key === thisKey) thisMonth += 1;
      if (key === lastKey) lastMonth += 1;
    }

    const delta = thisMonth - lastMonth;
    const pct = lastMonth === 0
      ? (thisMonth > 0 ? 100 : 0)
      : Math.round((delta / lastMonth) * 100);

    const byCorretor = [...corretores]
      .map((nome) => ({
        nome,
        total: documentacoes.filter((d) => d.corretor === nome).length,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);

    return { thisMonth, lastMonth, delta, pct, byCorretor };
  }, [documentacoes, corretores]);

  function openResultado(doc: Documentacao) {
    if (didDrag.current) return;
    setSelectedDoc(doc);
    if (doc.resultado) setResultado(doc.resultado);
    else if (doc.status === "aprovada") setResultado("aprovado");
    else if (doc.status === "pendencia") setResultado("aprovado_parcialmente");
    else if (doc.status === "recusada") setResultado("reprovado");
    else setResultado("aprovado");
    setObservacao(doc.observacao ?? "");
  }

  function saveResultado(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoc) return;
    const status = resultadoToStatus(resultado);
    updateDocumentacao(selectedDoc.id, {
      resultado,
      status,
      observacao: observacao.trim() || undefined,
    });
    toast.success(`Resultado salvo: ${resultadoLabel(resultado)}`);
    setSelectedDoc(null);
  }

  function onDrop(status: DocumentacaoStatus) {
    if (!dragging) return;
    const doc = documentacoes.find((d) => d.id === dragging);
    updateStatus(dragging, status);
    setDragging(null);
    if (doc) {
      toast.success(`${doc.nome} movido para ${statusLabel(status)}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="Resultado"
        description="Acompanhe as documentações dos corretores — tabela ou kanban — e registre o resultado."
        actions={
          <div className="flex rounded-lg border p-0.5 bg-muted/40">
            <Button
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              className="h-8"
              onClick={() => setView("table")}
            >
              <LayoutList className="w-4 h-4 mr-1.5" /> Tabela
            </Button>
            <Button
              size="sm"
              variant={view === "kanban" ? "default" : "ghost"}
              className="h-8"
              onClick={() => setView("kanban")}
            >
              <Kanban className="w-4 h-4 mr-1.5" /> Kanban
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Documentações neste mês</div>
            <div className="flex items-end justify-between gap-2">
              <div className="text-2xl font-bold tabular-nums">{metrics.thisMonth}</div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  metrics.delta > 0 && "text-success",
                  metrics.delta < 0 && "text-destructive",
                  metrics.delta === 0 && "text-muted-foreground",
                )}
              >
                {metrics.delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : null}
                {metrics.delta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                {metrics.delta === 0 ? <Minus className="w-3.5 h-3.5" /> : null}
                {metrics.delta > 0 ? "+" : ""}
                {metrics.delta} ({metrics.pct > 0 ? "+" : ""}
                {metrics.pct}%) vs mês passado ({metrics.lastMonth})
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-1 lg:col-span-2">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-2">Por corretor</div>
            <div className="flex flex-wrap gap-2">
              {metrics.byCorretor.length === 0 ? (
                <span className="text-sm text-muted-foreground">Nenhuma documentação ainda.</span>
              ) : (
                metrics.byCorretor.map((c) => (
                  <div
                    key={c.nome}
                    className="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{c.nome}</span>
                    <Badge variant="secondary" className="tabular-nums">{c.total}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou corretor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={corretorFilter} onValueChange={setCorretorFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os corretores</SelectItem>
              {corretores.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {view === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>FGTS</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Renda</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhuma documentação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell>{d.corretor}</TableCell>
                    <TableCell>{d.temFgts ? "Sim" : "Não"}</TableCell>
                    <TableCell>{d.temEntrada ? "Sim" : "Não"}</TableCell>
                    <TableCell className="tabular-nums">{brl(d.renda)}</TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openResultado(d)}>
                        <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                        Resultado
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
          {DOCUMENTACAO_STAGES.map((stage) => {
            const stageDocs = filtered.filter((d) => d.status === stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(stage.id)}
                className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={stage.color}>{stage.name}</Badge>
                    <span className="text-xs text-muted-foreground">{stageDocs.length}</span>
                  </div>
                </div>
                <div className="space-y-2 min-h-16 flex-1">
                  {stageDocs.map((d) => (
                    <Card
                      key={d.id}
                      draggable
                      onDragStart={() => {
                        didDrag.current = false;
                        setDragging(d.id);
                      }}
                      onDrag={() => {
                        didDrag.current = true;
                      }}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => openResultado(d)}
                      className={cn(
                        "p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
                        dragging === d.id && "opacity-50",
                      )}
                    >
                      <div className="text-sm font-medium truncate mb-1">{d.nome}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <User className="w-3 h-3" />
                        {d.corretor.split(" ")[0]}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="secondary" className="text-[10px]">
                          FGTS: {d.temFgts ? "Sim" : "Não"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          Entrada: {d.temEntrada ? "Sim" : "Não"}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold text-primary">{brl(d.renda)}</div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FormDialogShell
        open={!!selectedDoc}
        onOpenChange={(o) => !o && setSelectedDoc(null)}
        icon={<Eye className="w-5 h-5" />}
        title={selectedDoc ? `Resultado — ${selectedDoc.nome}` : "Resultado"}
        description="Defina o resultado da documentação."
      >
        {selectedDoc && (
          <form onSubmit={saveResultado} className="flex flex-col min-h-0 flex-1">
            <FormDialogBody>
              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Documentação">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Corretor" value={selectedDoc.corretor} />
                  <DetailField label="Status atual" value={statusLabel(selectedDoc.status)} />
                  <DetailField label="FGTS" value={selectedDoc.temFgts ? "Sim" : "Não"} />
                  <DetailField label="Entrada" value={selectedDoc.temEntrada ? "Sim" : "Não"} />
                  <DetailField label="Renda" value={brl(selectedDoc.renda)} />
                  <DetailField label="Enviada em" value={formatDate(selectedDoc.createdAt)} />
                </div>
              </FormSection>
              <FormSection icon={<ClipboardCheck className="w-3.5 h-3.5 text-primary" />} title="Resultado">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Resultado</Label>
                    <Select
                      value={resultado}
                      onValueChange={(v) => setResultado(v as Exclude<ResultadoAnalise, null>)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="aprovado_parcialmente">Aprovado parcialmente</SelectItem>
                        <SelectItem value="reprovado">Reprovado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="obs">Observação</Label>
                    <Textarea
                      id="obs"
                      rows={3}
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Notas do resultado (opcional)"
                    />
                  </div>
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button type="button" variant="outline" onClick={() => setSelectedDoc(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar resultado</Button>
            </FormDialogActions>
          </form>
        )}
      </FormDialogShell>
    </div>
  );
}
