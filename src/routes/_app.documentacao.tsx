import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { getSession } from "@/lib/mock-auth";
import { canViewTeamData } from "@/lib/permissions";
import { brl } from "@/lib/mock-data";
import {
  useDocumentacao,
  DOCUMENTACAO_STAGES,
  statusLabel,
  resultadoLabel,
  type Documentacao,
  type DocumentacaoStatus,
} from "@/lib/documentacao-store";
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, FolderOpen, FileUp, Wallet,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/documentacao")({
  head: () => ({ meta: [{ title: "Documentação — Imob CRM" }] }),
  component: DocumentacaoPage,
});

type FormState = {
  nome: string;
  temFgts: boolean;
  temEntrada: boolean;
  renda: string;
};

type FormMode = "create" | "edit";

function emptyForm(): FormState {
  return { nome: "", temFgts: false, temEntrada: false, renda: "" };
}

function formFromDoc(d: Documentacao): FormState {
  return {
    nome: d.nome,
    temFgts: d.temFgts,
    temEntrada: d.temEntrada,
    renda: String(d.renda),
  };
}

function parseRenda(value: string) {
  const n = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function statusBadge(status: DocumentacaoStatus) {
  const stage = DOCUMENTACAO_STAGES.find((s) => s.id === status);
  return <Badge className={stage?.color}>{stage?.name ?? status}</Badge>;
}

function DocumentacaoPage() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;

  const {
    documentacoes: allDocs,
    addDocumentacao,
    updateDocumentacao,
    deleteDocumentacao,
  } = useDocumentacao();

  const docs = isCorretor && user
    ? allDocs.filter((d) => d.corretor === user.name)
    : allDocs;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fgtsFilter, setFgtsFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [detail, setDetail] = useState<Documentacao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Documentacao | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (q && !`${d.nome} ${d.corretor}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (fgtsFilter === "sim" && !d.temFgts) return false;
      if (fgtsFilter === "nao" && d.temFgts) return false;
      return true;
    });
  }, [docs, search, statusFilter, fgtsFilter]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(d: Documentacao) {
    setFormMode("edit");
    setEditingId(d.id);
    setForm(formFromDoc(d));
    setFormOpen(true);
    setDetail(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const renda = parseRenda(form.renda);
    if (!nome) {
      toast.error("Informe o nome.");
      return;
    }
    if (!Number.isFinite(renda) || renda <= 0) {
      toast.error("Informe uma renda válida.");
      return;
    }

    const now = new Date().toISOString();

    if (formMode === "edit" && editingId) {
      updateDocumentacao(editingId, {
        nome,
        temFgts: form.temFgts,
        temEntrada: form.temEntrada,
        renda,
      });
      toast.success("Documentação atualizada.");
    } else {
      const nums = allDocs.map((d) => Number(d.id.replace(/\D/g, ""))).filter(Number.isFinite);
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      addDocumentacao({
        id: `d${next}`,
        nome,
        temFgts: form.temFgts,
        temEntrada: form.temEntrada,
        renda,
        corretor: user?.name ?? "Corretor",
        status: "recebida",
        resultado: null,
        createdAt: now,
        updatedAt: now,
      });
      toast.success("Documentação enviada.");
    }

    setFormOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Documentação"
        description={
          isCorretor
            ? "Informe quando subir documentação de clientes — FGTS, entrada e renda."
            : "Documentações enviadas pelos corretores. Use Resultado para revisar o pipeline."
        }
        actions={
          <div className="flex gap-2">
            {canSeeTeam && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/resultado">Ir para Resultado</Link>
              </Button>
            )}
            {isCorretor && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1.5" />
                Nova documentação
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {isCorretor ? "Documentações enviadas" : "Total de documentações"}
              </div>
              <div className="text-2xl font-bold tabular-nums">{docs.length}</div>
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
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {DOCUMENTACAO_STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fgtsFilter} onValueChange={setFgtsFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="FGTS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">FGTS: todos</SelectItem>
              <SelectItem value="sim">Com FGTS</SelectItem>
              <SelectItem value="nao">Sem FGTS</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {!isCorretor && <TableHead>Corretor</TableHead>}
              <TableHead>FGTS</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Renda</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enviada em</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isCorretor ? 7 : 8} className="text-center text-muted-foreground py-10">
                  Nenhuma documentação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nome}</TableCell>
                  {!isCorretor && <TableCell>{d.corretor}</TableCell>}
                  <TableCell>{d.temFgts ? "Sim" : "Não"}</TableCell>
                  <TableCell>{d.temEntrada ? "Sim" : "Não"}</TableCell>
                  <TableCell className="tabular-nums">{brl(d.renda)}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(d)}>
                          <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                        </DropdownMenuItem>
                        {isCorretor && (
                          <DropdownMenuItem onClick={() => openEdit(d)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                        )}
                        {isCorretor && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(d)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={<FolderOpen className="w-5 h-5" />}
        title={formMode === "create" ? "Nova documentação" : "Editar documentação"}
        description="Informe os dados financeiros do cliente."
      >
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <FormDialogBody>
            <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Dados">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="doc-nome">Nome</Label>
                  <Input
                    id="doc-nome"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Possui FGTS</div>
                    <div className="text-xs text-muted-foreground">Cliente usará FGTS na operação</div>
                  </div>
                  <Switch
                    checked={form.temFgts}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, temFgts: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Possui entrada</div>
                    <div className="text-xs text-muted-foreground">Há valor de entrada disponível</div>
                  </div>
                  <Switch
                    checked={form.temEntrada}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, temEntrada: v }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-renda">Renda mensal (R$)</Label>
                  <Input
                    id="doc-renda"
                    inputMode="decimal"
                    value={form.renda}
                    onChange={(e) => setForm((f) => ({ ...f, renda: e.target.value }))}
                    placeholder="Ex: 6500"
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {formMode === "create" ? "Enviar" : "Salvar"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.nome ?? "Detalhes"}
        description={detail ? statusLabel(detail.status) : undefined}
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Informações">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!isCorretor && <DetailField label="Corretor" value={detail.corretor} />}
                  <DetailField label="FGTS" value={detail.temFgts ? "Sim" : "Não"} />
                  <DetailField label="Entrada" value={detail.temEntrada ? "Sim" : "Não"} />
                  <DetailField label="Renda" value={brl(detail.renda)} />
                  <DetailField label="Status" value={statusLabel(detail.status)} />
                  <DetailField label="Resultado" value={resultadoLabel(detail.resultado)} />
                  <DetailField label="Enviada em" value={formatDate(detail.createdAt)} />
                  {detail.observacao && (
                    <div className="sm:col-span-2">
                      <DetailField label="Observação" value={detail.observacao} />
                    </div>
                  )}
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
              {isCorretor && (
                <Button onClick={() => openEdit(detail)}>Editar</Button>
              )}
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover a documentação de {deleteTarget?.nome}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteDocumentacao(deleteTarget.id);
                  toast.success("Documentação excluída.");
                  setDeleteTarget(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
