import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { brl, type Lead } from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import { ApiError } from "@/lib/api";
import {
  formatPhone,
  isValidPhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import {
  createDocumentacao,
  deleteDocumentacao,
  fetchDocumentacoes,
  updateDocumentacao,
  FONTE_LABELS,
  STATUS1_LABELS,
  STATUS2_LABELS,
  type CreateDocumentacaoInput,
  type Documentacao,
  type DocumentacaoFonte,
  type DocumentacaoStatus1,
  type DocumentacaoStatus2,
} from "@/lib/documentacao-api";
import {
  createConstrutora,
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchEquipeGerentes, type EquipeOptionUser } from "@/lib/equipes-api";
import {
  FolderOpen,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  Building,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/documentacao")({
  head: () => ({ meta: [{ title: "Documentação — Zone Connection" }] }),
  component: DocumentacaoPage,
});

type FormState = {
  leadId: string;
  clienteId: string;
  nome: string;
  construtoraId: string;
  empreendimentoId: string;
  fonte: DocumentacaoFonte;
  status1: DocumentacaoStatus1;
  status2: DocumentacaoStatus2;
  corretorId: string;
  gerenteId: string;
  dataAnalise: string;
  dataVenda: string;
  vgv: string;
  obs: string;
};

const emptyForm = (): FormState => ({
  leadId: "",
  clienteId: "",
  nome: "",
  construtoraId: "",
  empreendimentoId: "",
  fonte: "outro",
  status1: "analise",
  status2: "andamento",
  corretorId: "",
  gerenteId: "",
  dataAnalise: "",
  dataVenda: "",
  vgv: "",
  obs: "",
});

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function DocumentacaoPage() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const isAdmin = user?.role === "admin";
  const { leads, assignees, loading: leadsLoading } = useLeads();
  const { funnelStages } = useCatalog();

  const [items, setItems] = useState<Documentacao[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [gerentes, setGerentes] = useState<EquipeOptionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCorretorId, setFilterCorretorId] = useState<string>("__all__");

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickNome, setQuickNome] = useState("");
  const [quickContato, setQuickContato] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const stageLabel = useCallback(
    (slug: string) => funnelStages.find((s) => s.id === slug)?.name ?? slug,
    [funnelStages],
  );

  const stageBadgeClass = useCallback(
    (slug: string) =>
      funnelStages.find((s) => s.id === slug)?.color ??
      "bg-secondary text-secondary-foreground",
    [funnelStages],
  );

  const corretorOptions = useMemo(
    () => assignees.filter((a) => !a.role || a.role === "corretor"),
    [assignees],
  );
  const gerenteOptions = useMemo<EquipeOptionUser[]>(() => {
    const options =
      gerentes.length > 0
        ? gerentes
        : assignees
            .filter((a) => a.role === "gerente" || a.role === "admin")
            .map((a) => ({
              id: a.id,
              name: a.name,
              email: "",
              status: "ativo" as const,
            }));
    const managerFromDocs = items.flatMap((doc) =>
      doc.gerente
        ? [
            {
              id: doc.gerente.id,
              name: doc.gerente.name,
              email: "",
              status: "ativo" as const,
            },
          ]
        : [],
    );
    return [...options, ...managerFromDocs].filter(
      (option, index, all) =>
        all.findIndex((candidate) => candidate.id === option.id) === index,
    );
  }, [gerentes, assignees, items]);

  const filteredEmpreendimentos = useMemo(() => {
    if (!form.construtoraId) return empreendimentos;
    return empreendimentos.filter(
      (e) => !e.construtoraId || e.construtoraId === form.construtoraId,
    );
  }, [empreendimentos, form.construtoraId]);

  const visibleLeads = useMemo(() => {
    if (!user) return [];
    if (!isManager) {
      return leads.filter(
        (l) => l.corretorId === user.id || l.corretor === user.name,
      );
    }
    if (filterCorretorId !== "__all__") {
      return leads.filter((l) => l.corretorId === filterCorretorId);
    }
    return leads;
  }, [leads, user, isManager, filterCorretorId]);

  const leadOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "lead"),
    [visibleLeads],
  );
  const clienteOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "cliente"),
    [visibleLeads],
  );

  const loadLookups = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([
        fetchConstrutoras(),
        fetchEmpreendimentos({ ativo: true }),
      ]);
      setConstrutoras(c);
      setEmpreendimentos(e);
      if (isManager) {
        try {
          setGerentes(await fetchEquipeGerentes());
        } catch {
          setGerentes([]);
        }
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar construtoras/empreendimentos.",
      );
    }
  }, [isManager]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const corretorId =
        isManager && filterCorretorId !== "__all__"
          ? filterCorretorId
          : undefined;
      setItems(await fetchDocumentacoes(corretorId));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as documentações.",
      );
    } finally {
      setLoading(false);
    }
  }, [isManager, filterCorretorId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyContact(contact: Lead) {
    setForm((prev) => ({
      ...prev,
      nome: contact.nome,
      corretorId: contact.corretorId ?? prev.corretorId,
    }));
  }

  function selectLead(id: string) {
    setForm((prev) => ({ ...prev, leadId: id, clienteId: "" }));
    const contact = leads.find((l) => l.id === id);
    if (contact) applyContact(contact);
  }

  function selectCliente(id: string) {
    setForm((prev) => ({ ...prev, clienteId: id, leadId: "" }));
    const contact = leads.find((l) => l.id === id);
    if (contact) applyContact(contact);
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    const base = emptyForm();
    if (user?.role === "corretor") {
      base.corretorId = user.id;
    }
    setForm(base);
    setOpen(true);
  }

  function fillFromDoc(doc: Documentacao) {
    setForm({
      leadId: doc.tipoContato === "lead" ? doc.leadId : "",
      clienteId: doc.tipoContato === "cliente" ? doc.leadId : "",
      nome: doc.nome,
      construtoraId: doc.construtoraId ?? "",
      empreendimentoId: doc.empreendimentoId ?? "",
      fonte: doc.fonte,
      status1: doc.status1,
      status2: doc.status2,
      corretorId: doc.corretorId ?? "",
      gerenteId: doc.gerenteId ?? "",
      dataAnalise: toDateInput(doc.dataAnalise),
      dataVenda: toDateInput(doc.dataVenda),
      vgv: doc.vgv != null ? String(doc.vgv) : "",
      obs: doc.obs ?? "",
    });
  }

  function openView(doc: Documentacao) {
    setFormMode("view");
    setEditingId(doc.id);
    fillFromDoc(doc);
    setOpen(true);
  }

  function openEdit(doc: Documentacao) {
    setFormMode("edit");
    setEditingId(doc.id);
    fillFromDoc(doc);
    setOpen(true);
  }

  function buildPayload(): CreateDocumentacaoInput | null {
    const leadId = form.leadId || form.clienteId;
    if (!leadId) {
      toast.error("Selecione um lead ou cliente.");
      return null;
    }
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome.");
      return null;
    }

    const vgvDigits = form.vgv.replace(/\D/g, "");
    return {
      leadId,
      nome: form.nome.trim(),
      construtoraId: form.construtoraId || null,
      empreendimentoId: form.empreendimentoId || null,
      fonte: form.fonte,
      status1: form.status1,
      status2: form.status2,
      corretorId: form.corretorId || null,
      gerenteId: form.gerenteId || null,
      dataAnalise: form.dataAnalise || null,
      dataVenda: form.dataVenda || null,
      vgv: vgvDigits ? Number(vgvDigits) : null,
      obs: form.obs.trim() || null,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formMode === "view") return;
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      if (formMode === "create") {
        await createDocumentacao(payload);
        toast.success("Documentação criada.");
      } else if (editingId) {
        const { leadId: _leadId, ...patch } = payload;
        await updateDocumentacao(editingId, patch);
        toast.success("Documentação atualizada.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteDocumentacao(deleteId);
      toast.success("Documentação excluída.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  async function handleQuickCreate(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    if (quickNome.trim().length < 2) {
      toast.error("Informe o nome da construtora.");
      return;
    }
    if (quickContato.trim() && !isValidPhone(quickContato)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    setQuickSaving(true);
    try {
      const created = await createConstrutora({
        nome: quickNome.trim(),
        contato: quickContato.trim() || undefined,
      });
      await loadLookups();
      setField("construtoraId", created.id);
      setQuickOpen(false);
      setQuickNome("");
      setQuickContato("");
      toast.success("Construtora criada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível criar.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  const readOnly = formMode === "view";

  return (
    <div>
      <PageHeader
        title="Documentação"
        description="Fichas operacionais vinculadas a leads e clientes."
        actions={
          <Button onClick={openCreate} disabled={leadsLoading}>
            <Plus className="w-4 h-4 mr-1" />
            Nova documentação
          </Button>
        }
      />

      {isManager && (
        <div className="mb-4 max-w-xs">
          <Label className="mb-1.5 block">Filtrar por corretor</Label>
          <Select value={filterCorretorId} onValueChange={setFilterCorretorId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {corretorOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FolderOpen className="w-8 h-8 opacity-40" />
              <p>Nenhuma documentação cadastrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Construtora</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>VGV</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="font-medium">{doc.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc.lead.tipo === "cliente" ? "Cliente" : "Lead"} ·{" "}
                        <Badge
                          variant="secondary"
                          className={stageBadgeClass(doc.stageSituacao)}
                        >
                          {stageLabel(doc.stageSituacao)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{doc.construtora?.nome ?? "—"}</TableCell>
                    <TableCell>{doc.empreendimento?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {STATUS1_LABELS[doc.status1]}
                        </Badge>
                        <div>
                          <Badge variant="secondary">
                            {STATUS2_LABELS[doc.status2]}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.corretor?.name ?? doc.lead.corretor?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {doc.vgv != null ? brl(doc.vgv) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openView(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(doc)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(doc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<FolderOpen className="w-5 h-5" />}
        title={
          formMode === "create"
            ? "Nova documentação"
            : formMode === "edit"
              ? "Editar documentação"
              : "Documentação"
        }
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection title="Lead / Cliente">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lead</Label>
                  <Select
                    value={form.leadId || "__none__"}
                    onValueChange={(v) =>
                      v === "__none__" ? setField("leadId", "") : selectLead(v)
                    }
                    disabled={readOnly || formMode === "edit"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {leadOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.clienteId || "__none__"}
                    onValueChange={(v) =>
                      v === "__none__"
                        ? setField("clienteId", "")
                        : selectCliente(v)
                    }
                    disabled={readOnly || formMode === "edit"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {clienteOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            <FormSection title="Dados da planilha">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    disabled={readOnly}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Construtora</Label>
                    {isAdmin && !readOnly && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => setQuickOpen(true)}
                      >
                        + Nova construtora
                      </Button>
                    )}
                  </div>
                  <Select
                    value={form.construtoraId || "__none__"}
                    onValueChange={(v) => {
                      setField("construtoraId", v === "__none__" ? "" : v);
                      setField("empreendimentoId", "");
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {construtoras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Empreendimento</Label>
                  <Select
                    value={form.empreendimentoId || "__none__"}
                    onValueChange={(v) =>
                      setField("empreendimentoId", v === "__none__" ? "" : v)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {filteredEmpreendimentos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                          {e.cidade ? ` · ${e.cidade}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fonte</Label>
                  <Select
                    value={form.fonte}
                    onValueChange={(v) =>
                      setField("fonte", v as DocumentacaoFonte)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FONTE_LABELS) as DocumentacaoFonte[]).map(
                        (k) => (
                          <SelectItem key={k} value={k}>
                            {FONTE_LABELS[k]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status 1</Label>
                  <Select
                    value={form.status1}
                    onValueChange={(v) =>
                      setField("status1", v as DocumentacaoStatus1)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(STATUS1_LABELS) as DocumentacaoStatus1[]
                      ).map((k) => (
                        <SelectItem key={k} value={k}>
                          {STATUS1_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status 2</Label>
                  <Select
                    value={form.status2}
                    onValueChange={(v) =>
                      setField("status2", v as DocumentacaoStatus2)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(STATUS2_LABELS) as DocumentacaoStatus2[]
                      ).map((k) => (
                        <SelectItem key={k} value={k}>
                          {STATUS2_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Corretor</Label>
                  <Select
                    value={form.corretorId || "__none__"}
                    onValueChange={(v) =>
                      setField("corretorId", v === "__none__" ? "" : v)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {corretorOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gerente</Label>
                  <Select
                    value={form.gerenteId || "__none__"}
                    onValueChange={(v) =>
                      setField("gerenteId", v === "__none__" ? "" : v)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {gerenteOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataAnalise">Data análise</Label>
                  <Input
                    id="dataAnalise"
                    type="date"
                    value={form.dataAnalise}
                    onChange={(e) => setField("dataAnalise", e.target.value)}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataVenda">Data venda</Label>
                  <Input
                    id="dataVenda"
                    type="date"
                    value={form.dataVenda}
                    onChange={(e) => setField("dataVenda", e.target.value)}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vgv">VGV (R$)</Label>
                  <Input
                    id="vgv"
                    inputMode="numeric"
                    value={form.vgv}
                    onChange={(e) => setField("vgv", e.target.value)}
                    disabled={readOnly}
                    placeholder="Ex: 250000"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="obs">OBS</Label>
                  <Textarea
                    id="obs"
                    value={form.obs}
                    onChange={(e) => setField("obs", e.target.value)}
                    disabled={readOnly}
                    rows={3}
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            )}
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={quickOpen}
        onOpenChange={setQuickOpen}
        icon={<Building className="w-5 h-5" />}
        title="Nova construtora"
      >
        <form
          onSubmit={handleQuickCreate}
          className="flex flex-col flex-1 min-h-0"
        >
          <FormDialogBody>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="quickNome">Nome *</Label>
                <Input
                  id="quickNome"
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickContato">Contato</Label>
                <Input
                  id="quickContato"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={PHONE_PLACEHOLDER}
                  value={quickContato}
                  onChange={(e) => setQuickContato(formatPhone(e.target.value))}
                  maxLength={15}
                />
              </div>
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={quickSaving}>
              {quickSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
