import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection,
} from "@/components/form-dialog";
import { brl, type Lead } from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import { ApiError } from "@/lib/api";
import {
  createDocumentacao,
  deleteDocumentacao,
  fetchDocumentacoes,
  updateDocumentacao,
  type Documentacao,
} from "@/lib/documentacao-api";
import {
  formatPhone,
  isValidPhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import {
  FolderOpen, Plus, Loader2, User, Users, Wallet, FileText, Trash2, Pencil, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/documentacao")({
  head: () => ({ meta: [{ title: "Documentação — NP Connect" }] }),
  component: DocumentacaoPage,
});

type FormState = {
  leadId: string;
  clienteId: string;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  renda: string;
  temFgts: "sim" | "nao" | "";
  valorFgts: string;
  temEntrada: "sim" | "nao" | "";
  valorEntrada: string;
  temDependente: "sim" | "nao" | "";
};

const emptyForm = (): FormState => ({
  leadId: "",
  clienteId: "",
  nome: "",
  telefone: "",
  email: "",
  origem: "",
  interesse: "Comprar",
  cidade: "",
  bairro: "",
  prioridade: "Média",
  renda: "",
  temFgts: "",
  valorFgts: "",
  temEntrada: "",
  valorEntrada: "",
  temDependente: "",
});

function DocumentacaoPage() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const { leads, assignees, loading: leadsLoading } = useLeads();
  const { funnelStages, origens } = useCatalog();

  const [items, setItems] = useState<Documentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCorretorId, setFilterCorretorId] = useState<string>("__all__");

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const selectedContact = useMemo(() => {
    const id = form.leadId || form.clienteId;
    if (!id) return null;
    return leads.find((l) => l.id === id) ?? null;
  }, [form.leadId, form.clienteId, leads]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const corretorId =
        isManager && filterCorretorId !== "__all__"
          ? filterCorretorId
          : undefined;
      const data = await fetchDocumentacoes(corretorId);
      setItems(data);
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

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyContact(contact: Lead) {
    setForm((prev) => ({
      ...prev,
      nome: contact.nome,
      telefone: contact.telefone,
      email: contact.email,
      origem: contact.origem,
      interesse: contact.interesse,
      cidade: contact.cidade,
      bairro: contact.bairro,
      prioridade: contact.prioridade,
      renda: contact.renda != null ? String(contact.renda) : "",
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
    setForm(emptyForm());
    setOpen(true);
  }

  function openView(doc: Documentacao) {
    setFormMode("view");
    setEditingId(doc.id);
    setForm({
      leadId: doc.tipoContato === "lead" ? doc.leadId : "",
      clienteId: doc.tipoContato === "cliente" ? doc.leadId : "",
      nome: doc.nome,
      telefone: doc.telefone,
      email: doc.email,
      origem: doc.origem,
      interesse: doc.interesse,
      cidade: doc.cidade,
      bairro: doc.bairro,
      prioridade: doc.prioridade,
      renda: doc.renda != null ? String(doc.renda) : "",
      temFgts: doc.temFgts ? "sim" : "nao",
      valorFgts: doc.valorFgts != null ? String(doc.valorFgts) : "",
      temEntrada: doc.temEntrada ? "sim" : "nao",
      valorEntrada: doc.valorEntrada != null ? String(doc.valorEntrada) : "",
      temDependente: doc.temDependente ? "sim" : "nao",
    });
    setOpen(true);
  }

  function openEdit(doc: Documentacao) {
    openView(doc);
    setFormMode("edit");
  }

  function validateForm(): CreatePayload | null {
    const leadId = form.leadId || form.clienteId;
    if (!leadId) {
      toast.error("Selecione um lead ou um cliente.");
      return null;
    }
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      toast.error("Informe o nome completo.");
      return null;
    }
    if (!isValidPhone(form.telefone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return null;
    }
    if (!form.email.trim()) {
      toast.error("Informe o e-mail.");
      return null;
    }
    if (!form.origem.trim()) {
      toast.error("Informe a origem.");
      return null;
    }
    if (!form.cidade.trim() || !form.bairro.trim()) {
      toast.error("Informe cidade e bairro.");
      return null;
    }
    if (!form.temFgts || !form.temEntrada || !form.temDependente) {
      toast.error("Responda FGTS, entrada e dependente.");
      return null;
    }

    const temFgts = form.temFgts === "sim";
    const temEntrada = form.temEntrada === "sim";
    const temDependente = form.temDependente === "sim";

    const valorFgtsDigits = form.valorFgts.replace(/\D/g, "");
    const valorEntradaDigits = form.valorEntrada.replace(/\D/g, "");
    const rendaDigits = form.renda.replace(/\D/g, "");

    if (temFgts && !valorFgtsDigits) {
      toast.error("Informe o valor do FGTS.");
      return null;
    }
    if (temEntrada && !valorEntradaDigits) {
      toast.error("Informe o valor da entrada.");
      return null;
    }

    return {
      leadId,
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      origem: form.origem.trim(),
      interesse: form.interesse,
      cidade: form.cidade.trim(),
      bairro: form.bairro.trim(),
      prioridade: form.prioridade,
      renda: rendaDigits ? Number(rendaDigits) : null,
      temFgts,
      valorFgts: temFgts ? Number(valorFgtsDigits) : null,
      temEntrada,
      valorEntrada: temEntrada ? Number(valorEntradaDigits) : null,
      temDependente,
    };
  }

  type CreatePayload = {
    leadId: string;
    nome: string;
    telefone: string;
    email: string;
    origem: string;
    interesse: Lead["interesse"];
    cidade: string;
    bairro: string;
    prioridade: Lead["prioridade"];
    renda: number | null;
    temFgts: boolean;
    valorFgts: number | null;
    temEntrada: boolean;
    valorEntrada: number | null;
    temDependente: boolean;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formMode === "view") return;
    const payload = validateForm();
    if (!payload) return;

    setSaving(true);
    try {
      if (formMode === "create") {
        await createDocumentacao(payload);
        toast.success("Documentação cadastrada.");
      } else if (editingId) {
        const { leadId: _leadId, ...patch } = payload;
        await updateDocumentacao(editingId, patch);
        toast.success("Documentação atualizada.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a documentação.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteDocumentacao(deleteId);
      toast.success("Documentação excluída.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a documentação.",
      );
    }
  }

  const readOnly = formMode === "view";
  const origemOptions = origens;

  function formatWhen(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <PageHeader
        title="Documentação"
        description="Cadastre a ficha documental do lead ou cliente, com FGTS, entrada e dependentes."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        }
      />

      {isManager && (
        <div className="mb-4 max-w-xs">
          <Label className="text-xs text-muted-foreground">Filtrar por corretor</Label>
          <Select value={filterCorretorId} onValueChange={setFilterCorretorId}>
            <SelectTrigger className="h-10 mt-1.5 bg-background">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os corretores</SelectItem>
              {assignees.map((a) => (
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
          {loading || leadsLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando documentações...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma documentação cadastrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em Novo e selecione um lead ou cliente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>FGTS</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Dependente</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="font-medium">{doc.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.telefone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {doc.tipoContato}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px] border-transparent",
                            stageBadgeClass(doc.stageSituacao),
                          )}
                        >
                          {stageLabel(doc.stageSituacao)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc.temFgts
                          ? doc.valorFgts != null
                            ? brl(doc.valorFgts)
                            : "Sim"
                          : "Não"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc.temEntrada
                          ? doc.valorEntrada != null
                            ? brl(doc.valorEntrada)
                            : "Sim"
                          : "Não"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc.temDependente ? "Sim" : "Não"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatWhen(doc.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openView(doc)}
                            title="Ver"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(doc)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(doc.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
        description={
          formMode === "create"
            ? "Selecione o contato — os dados do cadastro serão preenchidos automaticamente."
            : undefined
        }
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection
              icon={<Users className="w-3.5 h-3.5 text-primary" />}
              title="Contato"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lead</Label>
                  <Select
                    value={form.leadId || "__none__"}
                    onValueChange={(v) =>
                      v === "__none__" ? setField("leadId", "") : selectLead(v)
                    }
                    disabled={readOnly || formMode === "edit"}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Selecionar lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {leadOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <Select
                    value={form.clienteId || "__none__"}
                    onValueChange={(v) =>
                      v === "__none__"
                        ? setField("clienteId", "")
                        : selectCliente(v)
                    }
                    disabled={readOnly || formMode === "edit"}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {clienteOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(selectedContact || formMode !== "create") && (
                <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Situação atual:</span>
                  <Badge
                    className={cn(
                      "text-[10px] border-transparent",
                      stageBadgeClass(
                        selectedContact?.stage ??
                          items.find((d) => d.id === editingId)?.stageSituacao ??
                          "",
                      ),
                    )}
                  >
                    {stageLabel(
                      selectedContact?.stage ??
                        items.find((d) => d.id === editingId)?.stageSituacao ??
                        "—",
                    )}
                  </Badge>
                  {selectedContact && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {selectedContact.tipo}
                    </Badge>
                  )}
                </div>
              )}
            </FormSection>

            <FormSection
              icon={<User className="w-3.5 h-3.5 text-primary" />}
              title="Dados cadastrais"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    disabled={readOnly}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setField("telefone", formatPhone(e.target.value))}
                    placeholder={PHONE_PLACEHOLDER}
                    disabled={readOnly}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    disabled={readOnly}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <Select
                    value={form.origem || "__none__"}
                    onValueChange={(v) =>
                      setField("origem", v === "__none__" ? "" : v)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>
                        Selecione
                      </SelectItem>
                      {origemOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                      {form.origem && !origemOptions.includes(form.origem) && (
                        <SelectItem value={form.origem}>{form.origem}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Interesse</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Comprar", "Alugar", "Investir"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={readOnly}
                        onClick={() => setField("interesse", opt)}
                        className={cn(
                          "h-10 rounded-lg border text-sm font-medium transition-colors",
                          form.interesse === opt
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "bg-background text-muted-foreground hover:bg-accent",
                          readOnly && "opacity-60 pointer-events-none",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                    disabled={readOnly}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bairro</Label>
                  <Input
                    value={form.bairro}
                    onChange={(e) => setField("bairro", e.target.value)}
                    disabled={readOnly}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Renda mensal <span className="font-normal">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                      R$
                    </span>
                    <Input
                      inputMode="numeric"
                      value={form.renda}
                      onChange={(e) =>
                        setField("renda", e.target.value.replace(/\D/g, ""))
                      }
                      disabled={readOnly}
                      className="h-10 bg-background pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Alta", "Média", "Baixa"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={readOnly}
                        onClick={() => setField("prioridade", opt)}
                        className={cn(
                          "h-10 rounded-lg border text-sm font-medium transition-colors",
                          form.prioridade === opt
                            ? "border-primary bg-primary/10 text-primary"
                            : "bg-background text-muted-foreground hover:bg-accent",
                          readOnly && "opacity-60 pointer-events-none",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
              title="Documentação financeira"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
                <div className="space-y-3">
                  <YesNoField
                    label="Possui FGTS?"
                    value={form.temFgts}
                    onChange={(v) => {
                      setField("temFgts", v);
                      if (v === "nao") setField("valorFgts", "");
                    }}
                    disabled={readOnly}
                  />
                  {form.temFgts === "sim" && (
                    <MoneyField
                      label="Valor do FGTS"
                      value={form.valorFgts}
                      onChange={(v) => setField("valorFgts", v)}
                      disabled={readOnly}
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoField
                    label="Possui entrada?"
                    value={form.temEntrada}
                    onChange={(v) => {
                      setField("temEntrada", v);
                      if (v === "nao") setField("valorEntrada", "");
                    }}
                    disabled={readOnly}
                  />
                  {form.temEntrada === "sim" && (
                    <MoneyField
                      label="Valor da entrada"
                      value={form.valorEntrada}
                      onChange={(v) => setField("valorEntrada", v)}
                      disabled={readOnly}
                    />
                  )}
                </div>

                <div className="sm:col-span-2">
                  <YesNoField
                    label="Possui dependente?"
                    value={form.temDependente}
                    onChange={(v) => setField("temDependente", v)}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>

          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                <FileText className="w-4 h-4 mr-1" />
                {formMode === "create" ? "Cadastrar" : "Salvar"}
              </Button>
            )}
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: "sim" | "nao" | "";
  onChange: (v: "sim" | "nao") => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5 w-full">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2 w-full">
        {(["sim", "nao"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={cn(
              "h-10 w-full rounded-lg border text-sm font-medium transition-colors",
              value === opt
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "bg-background text-muted-foreground hover:bg-accent",
              disabled && "opacity-60 pointer-events-none",
            )}
          >
            {opt === "sim" ? "Sim" : "Não"}
          </button>
        ))}
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5 w-full">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative w-full">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
          R$
        </span>
        <Input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          disabled={disabled}
          className="h-10 w-full bg-background pl-9"
          placeholder="0"
        />
      </div>
    </div>
  );
}
