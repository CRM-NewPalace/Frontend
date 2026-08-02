import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Filter, Download, MoreHorizontal, Phone, MessageSquare, Mail,
  UserPlus, MapPin, Wallet, Sparkles, Eye, Pencil, Trash2, X, Upload, FileSpreadsheet,
  FileText, Loader2,
} from "lucide-react";
import { brl, prioridadeBadgeClass, type Lead } from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import { importLeads } from "@/lib/leads-api";
import {
  downloadImportTemplate,
  exportLeadsToExcel,
  exportLeadsToPdf,
  parseLeadsFromFile,
  type ParsedImportLead,
} from "@/lib/leads-io";
import {
  formatPhone,
  isValidPhone,
  phoneDigits,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/_app/leads")({
  head: () => ({ meta: [{ title: "Leads — Zone Connection" }] }),
  component: LeadsPage,
});

type FormState = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  temperatura: "Quente" | "Morno" | "Frio";
  /** Renda mensal do cliente (opcional); só dígitos no input. */
  renda: string;
  corretor: string;
};

const emptyForm = (corretorDefault: string, origemDefault = ""): FormState => ({
  nome: "",
  telefone: "",
  email: "",
  origem: origemDefault,
  interesse: "Comprar",
  cidade: "",
  bairro: "",
  prioridade: "Média",
  temperatura: "Morno",
  renda: "",
  corretor: corretorDefault,
});

type FormMode = "create" | "edit";

function leadToForm(lead: Lead): FormState {
  const temp = (["Quente", "Morno", "Frio"] as const).find((t) => lead.tags.includes(t)) ?? "Morno";
  return {
    nome: lead.nome,
    telefone: formatPhone(lead.telefone),
    email: lead.email,
    origem: lead.origem,
    interesse: lead.interesse,
    cidade: lead.cidade,
    bairro: lead.bairro,
    prioridade: lead.prioridade,
    temperatura: temp,
    renda: lead.renda != null ? String(lead.renda) : "",
    corretor: lead.corretor,
  };
}

function LeadsPage() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;

  const {
    leads: allLeads,
    addLead,
    updateLead,
    markLeadLost,
    loading,
    resolveCorretorId,
    assignees,
    refresh,
  } = useLeads();
  const { funnelStages, origens: origemOptions, motivos: motivoOptions, colorByLabel } = useCatalog();
  // Backend atribui a etapa inicial (Novo lead) quando stage é omitido.
  const defaultStageName =
    funnelStages.find((s) => s.id === "novo")?.name ??
    funnelStages[0]?.name ??
    "Novo lead";

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importHelpOpen, setImportHelpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportLead[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFileName, setImportFileName] = useState("");

  const leads = useMemo(
    () => {
      const scoped =
        isCorretor && user
          ? allLeads.filter((l) => l.corretor === user.name || l.corretorId === user.id)
          : allLeads;
      return scoped.filter((l) => l.tipo === "lead");
    },
    [allLeads, isCorretor, user],
  );

  /** Corretores ativos (perfil corretor) para atribuição/filtro. */
  const corretorAssignees = useMemo(
    () => assignees.filter((a) => !a.role || a.role === "corretor"),
    [assignees],
  );

  const defaultCorretor =
    isCorretor && user ? user.name : (corretorAssignees[0]?.name ?? "");

  /** Opções do formulário (por nome). */
  const corretorSelectOptions = useMemo(
    () => corretorAssignees.map((a) => a.name),
    [corretorAssignees],
  );

  /** Opções do filtro (por id UUID — o que a API espera). */
  const corretorFilterOptions = useMemo(() => corretorAssignees, [corretorAssignees]);

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(""));
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleteMotivoOutro, setDeleteMotivoOutro] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  /** UUID do corretor ou "all". */
  const [corretorFilter, setCorretorFilter] = useState<string>("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("all");
  const [interesseFilter, setInteresseFilter] = useState<string>("all");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [showExtraFilters, setShowExtraFilters] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const filtersActive =
    debouncedSearch !== "" ||
    stageFilter !== "all" ||
    corretorFilter !== "all" ||
    prioridadeFilter !== "all" ||
    interesseFilter !== "all" ||
    origemFilter !== "all";

  const extraFiltersActive =
    prioridadeFilter !== "all" || interesseFilter !== "all" || origemFilter !== "all";

  // Filtra no cliente sobre a lista já carregada no store — evita round-trip
  // ao Postgres remoto a cada mudança de filtro.
  const filteredLeads = useMemo(() => {
    if (!filtersActive) return leads;
    const q = debouncedSearch.toLowerCase();
    const qDigits = phoneDigits(debouncedSearch);
    return leads.filter((l) => {
      if (q) {
        const hay = `${l.nome} ${l.email} ${l.telefone}`.toLowerCase();
        const phoneOk = qDigits.length >= 3 && phoneDigits(l.telefone).includes(qDigits);
        if (!hay.includes(q) && !phoneOk) return false;
      }
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!isCorretor && corretorFilter !== "all" && l.corretorId !== corretorFilter) return false;
      if (prioridadeFilter !== "all" && l.prioridade !== prioridadeFilter) return false;
      if (interesseFilter !== "all" && l.interesse !== interesseFilter) return false;
      if (origemFilter !== "all" && l.origem !== origemFilter) return false;
      return true;
    });
  }, [
    leads,
    filtersActive,
    debouncedSearch,
    stageFilter,
    corretorFilter,
    prioridadeFilter,
    interesseFilter,
    origemFilter,
    isCorretor,
  ]);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStageFilter("all");
    setCorretorFilter("all");
    setPrioridadeFilter("all");
    setInteresseFilter("all");
    setOrigemFilter("all");
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm(defaultCorretor, origemOptions[0] ?? ""));
    setOpen(true);
  }

  function openEdit(lead: Lead) {
    setFormMode("edit");
    setEditingId(lead.id);
    setForm(leadToForm(lead));
    setOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const email = form.email.trim();

    if (!nome || !telefone || !email) {
      toast.error("Preencha nome, telefone e e-mail.");
      return;
    }
    if (!isValidPhone(telefone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (!form.origem || !origemOptions.includes(form.origem)) {
      toast.error(
        origemOptions.length === 0
          ? "Cadastre ao menos uma origem em Configurações."
          : "Selecione uma origem válida.",
      );
      return;
    }

    const rendaDigits = String(form.renda).replace(/\D/g, "");
    const rendaNum = rendaDigits ? Number(rendaDigits) : null;
    const corretorNome = isCorretor ? defaultCorretor : form.corretor;
    const otherTags = formMode === "edit" && editingId
      ? (leads.find((l) => l.id === editingId)?.tags.filter((t) => !["Quente", "Morno", "Frio"].includes(t)) ?? [])
      : [];
    const tags = [form.temperatura, ...otherTags];
    const corretorId = isCorretor ? undefined : resolveCorretorId(corretorNome);

    try {
      if (formMode === "edit" && editingId) {
        setOpen(false);
        toast.success(`Lead ${nome} atualizado.`);
        await updateLead(editingId, {
          nome,
          telefone,
          email,
          origem: form.origem,
          interesse: form.interesse,
          cidade: form.cidade.trim(),
          bairro: form.bairro.trim(),
          prioridade: form.prioridade,
          renda: rendaNum,
          tags,
          ...(corretorId ? { corretorId } : {}),
        });
        return;
      }

      setOpen(false);
      toast.success(`Lead ${nome} criado com sucesso.`);
      await addLead({
        tipo: "lead",
        nome,
        telefone,
        email,
        origem: form.origem,
        interesse: form.interesse,
        cidade: form.cidade.trim(),
        bairro: form.bairro.trim(),
        prioridade: form.prioridade,
        ...(rendaNum != null ? { renda: rendaNum } : {}),
        tags,
        ...(corretorId ? { corretorId } : {}),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o lead.");
    }
  }

  async function confirmDelete() {
    if (!deleteLead) return;
    const motivo =
      deleteMotivo === "__outro__"
        ? deleteMotivoOutro.trim()
        : deleteMotivo.trim();
    if (!motivo) {
      toast.error(
        motivoOptions.length === 0
          ? "Informe o motivo da exclusão."
          : "Selecione o motivo da exclusão.",
      );
      return;
    }
    try {
      const id = deleteLead.id;
      const nome = deleteLead.nome;
      setDeleteLead(null);
      setDeleteMotivo("");
      setDeleteMotivoOutro("");
      toast.success(`Lead ${nome} movido para Leads Perdidos.`);
      await markLeadLost(id, motivo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o lead.");
    }
  }

  async function handleImportFile(file: File) {
    setImportParsing(true);
    setImportFileName(file.name);
    try {
      const rows = await parseLeadsFromFile(file, {
        origem: origemOptions[0] ?? "Importação",
      });
      if (rows.length === 0) {
        toast.error("Nenhum lead encontrado no arquivo.");
        return;
      }
      setImportRows(rows);
      setImportOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível ler o arquivo.",
      );
    } finally {
      setImportParsing(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function confirmImport() {
    const valid = importRows.filter((r) => !r.error);
    if (valid.length === 0) {
      toast.error("Nenhum lead válido para importar.");
      return;
    }
    setImportSaving(true);
    try {
      const result = await importLeads(
        valid.map((r) => ({
          nome: r.nome,
          telefone: r.telefone,
          origem: r.origem || origemOptions[0] || "Importação",
          interesse: r.interesse,
          cidade: r.cidade || undefined,
          bairro: r.bairro || undefined,
          prioridade: r.prioridade,
          renda: r.renda,
        })),
      );
      setImportOpen(false);
      setImportRows([]);
      await refresh({ silent: true });
      if (result.failed > 0) {
        const sample = result.errors
          .slice(0, 3)
          .map((e) => `${e.nome}: ${e.message}`)
          .join(" · ");
        toast.error(
          `${result.created} importado(s), ${result.failed} com erro.${
            sample ? ` ${sample}` : ""
          }`,
        );
      } else {
        toast.success(`${result.created} lead(s) importado(s).`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível importar os leads.",
      );
    } finally {
      setImportSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={isCorretor ? "Meus leads" : "Leads"}
        description={
          loading
            ? "Carregando leads..."
            : filteredLeads.length === leads.length && !filtersActive
            ? isCorretor
              ? `${leads.length} leads atribuídos a você`
              : `${leads.length} leads de toda a equipe no funil`
            : `${filteredLeads.length} de ${leads.length} leads`
        }
        actions={
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportHelpOpen(false);
                  void handleImportFile(file);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={importParsing}
              onClick={() => setImportHelpOpen(true)}
            >
              {importParsing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Importar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filteredLeads.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    exportLeadsToExcel(
                      filteredLeads,
                      `leads-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    )
                  }
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportLeadsToPdf(
                      filteredLeads,
                      `leads-${new Date().toISOString().slice(0, 10)}.pdf`,
                      user?.tenant?.name?.trim() || "Imobiliária",
                    )
                  }
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />Novo lead
            </Button>
          </>
        }
      />

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={formMode === "edit" ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar lead" : "Novo lead"}
        description={
          formMode === "edit"
            ? "Atualize os dados do contato no funil."
            : "Preencha os dados para adicionar o contato ao funil."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
              <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Contato">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-nome" className="text-xs text-muted-foreground">Nome completo</Label>
                  <Input
                    id="lead-nome"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    placeholder="Ex.: João Pereira"
                    className="h-10 bg-background"
                    autoFocus
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-telefone" className="text-xs text-muted-foreground">Telefone</Label>
                    <Input
                      id="lead-telefone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={form.telefone}
                      onChange={(e) => setField("telefone", formatPhone(e.target.value))}
                      placeholder={PHONE_PLACEHOLDER}
                      className="h-10 bg-background"
                      maxLength={15}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-email" className="text-xs text-muted-foreground">E-mail</Label>
                    <Input
                      id="lead-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="email@exemplo.com"
                      className="h-10 bg-background"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Origem</Label>
                    <Select
                      value={form.origem || undefined}
                      onValueChange={(v) => setField("origem", v)}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {origemOptions.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Nenhuma origem cadastrada
                          </SelectItem>
                        ) : (
                          origemOptions.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))
                        )}
                        {formMode === "edit" &&
                          form.origem &&
                          !origemOptions.includes(form.origem) && (
                            <SelectItem value={form.origem}>{form.origem}</SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isCorretor ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Corretor</Label>
                      <Select value={form.corretor} onValueChange={(v) => setField("corretor", v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {corretorSelectOptions.map((nome) => (
                            <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                          ))}
                          {form.corretor && !corretorSelectOptions.includes(form.corretor) && (
                            <SelectItem value={form.corretor}>{form.corretor}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Responsável</Label>
                      <div className="h-10 px-3 rounded-md border bg-muted/40 text-sm flex items-center text-muted-foreground">
                        {defaultCorretor}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>

              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Interesse e renda">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-renda" className="text-xs text-muted-foreground">
                    Renda mensal <span className="font-normal">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">R$</span>
                    <Input
                      id="lead-renda"
                      inputMode="numeric"
                      value={form.renda}
                      onChange={(e) => setField("renda", e.target.value.replace(/\D/g, ""))}
                      placeholder="Ex.: 8500"
                      className="h-10 bg-background pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "Alta" as const, active: "border-destructive/40 bg-destructive/10 text-destructive" },
                      { value: "Média" as const, active: "border-warning/50 bg-warning/15 text-warning-foreground" },
                      { value: "Baixa" as const, active: "border-primary/30 bg-secondary text-secondary-foreground" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField("prioridade", opt.value)}
                        className={cn(
                          "h-10 rounded-lg border text-sm font-medium transition-colors",
                          form.prioridade === opt.value
                            ? opt.active
                            : "bg-background text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Temperatura</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "Quente" as const, active: "border-destructive/40 bg-destructive/10 text-destructive" },
                      { value: "Morno" as const, active: "border-warning/50 bg-warning/15 text-warning-foreground" },
                      { value: "Frio" as const, active: "border-info/40 bg-info/10 text-info" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField("temperatura", opt.value)}
                        className={cn(
                          "h-10 rounded-lg border text-sm font-medium transition-colors",
                          form.temperatura === opt.value
                            ? opt.active
                            : "bg-background text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                </div>
              </FormSection>

              <FormSection icon={<MapPin className="w-3.5 h-3.5 text-primary" />} title="Localização">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-cidade" className="text-xs text-muted-foreground">Cidade</Label>
                    <Input
                      id="lead-cidade"
                      value={form.cidade}
                      onChange={(e) => setField("cidade", e.target.value)}
                      placeholder="Ex.: Recife"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-bairro" className="text-xs text-muted-foreground">Bairro</Label>
                    <Input
                      id="lead-bairro"
                      value={form.bairro}
                      onChange={(e) => setField("bairro", e.target.value)}
                      placeholder="Ex.: Boa Viagem"
                      className="h-10 bg-background"
                    />
                  </div>
                </div>
              </FormSection>
          </FormDialogBody>

          <FormDialogActions
            hint={
              formMode === "edit"
                ? "As alterações são salvas no banco."
                : <>O lead entra na etapa <span className="font-medium text-foreground">{defaultStageName}</span>.</>
            }
          >
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {formMode === "edit" ? (
                "Salvar alterações"
              ) : (
                <><Plus className="w-4 h-4" />Salvar lead</>
              )}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={!!detailLead}
        onOpenChange={(o) => !o && setDetailLead(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detailLead?.nome ?? "Detalhes do lead"}
        description={
          detailLead
            ? `${funnelStages.find((s) => s.id === detailLead.stage)?.name ?? detailLead.stage} · Prioridade ${detailLead.prioridade}`
            : undefined
        }
        className="sm:max-w-xl"
      >
        {detailLead && (
          <>
            <FormDialogBody>
              <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Contato">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Telefone" value={detailLead.telefone} />
                  <DetailField label="E-mail" value={detailLead.email} />
                  <DetailField label="Origem" value={detailLead.origem} />
                  {!isCorretor && <DetailField label="Corretor" value={detailLead.corretor} />}
                </div>
              </FormSection>
              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Interesse e renda">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detailLead.interesse} />
                  <DetailField
                    label="Renda mensal"
                    value={detailLead.renda != null ? brl(detailLead.renda) : "—"}
                  />
                  <DetailField
                    label="Prioridade"
                    value={
                      <Badge className={prioridadeBadgeClass(detailLead.prioridade)}>
                        {detailLead.prioridade}
                      </Badge>
                    }
                  />
                  {detailLead.tags.length > 0 && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <div className="text-xs text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detailLead.tags.map((t) => (
                          <Badge key={t} className={`text-[10px] ${colorByLabel("tag", t)}`}>{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
              <FormSection icon={<MapPin className="w-3.5 h-3.5 text-primary" />} title="Localização">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Cidade" value={detailLead.cidade} />
                  <DetailField label="Bairro" value={detailLead.bairro} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint={`Atualizado em ${detailLead.updatedAt}`}>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setDetailLead(null)}>
                Fechar
              </Button>
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => {
                  const lead = detailLead;
                  setDetailLead(null);
                  openEdit(lead);
                }}
              >
                <Pencil className="w-4 h-4" /> Editar
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={!!deleteLead}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteLead(null);
            setDeleteMotivo("");
            setDeleteMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Por que está excluindo este lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLead
                ? `${deleteLead.nome} sairá da sua lista e do funil, e irá para Leads Perdidos (visível só para o administrador).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-1">
            {motivoOptions.length > 0 ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Motivo</Label>
                  <Select value={deleteMotivo} onValueChange={setDeleteMotivo}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                    <SelectContent>
                      {motivoOptions.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                      <SelectItem value="__outro__">Outro…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {deleteMotivo === "__outro__" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="motivo-outro" className="text-xs text-muted-foreground">Descreva o motivo</Label>
                    <Input
                      id="motivo-outro"
                      value={deleteMotivoOutro}
                      onChange={(e) => setDeleteMotivoOutro(e.target.value)}
                      placeholder="Ex.: Cliente sem interesse"
                      className="h-10"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="motivo-livre" className="text-xs text-muted-foreground">Motivo</Label>
                <Input
                  id="motivo-livre"
                  value={deleteMotivo}
                  onChange={(e) => setDeleteMotivo(e.target.value)}
                  placeholder="Ex.: Cliente sem interesse"
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Cadastre motivos em Configurações para selecionar depois.
                </p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas etapas</SelectItem>
              {funnelStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isCorretor && (
            <Select value={corretorFilter} onValueChange={setCorretorFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Corretor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos corretores</SelectItem>
                {corretorFilterOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(extraFiltersActive && "border-primary text-primary")}
            onClick={() => setShowExtraFilters((v) => !v)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Mais filtros
            {extraFiltersActive && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px]" variant="secondary">
                {[prioridadeFilter, interesseFilter, origemFilter].filter((v) => v !== "all").length}
              </Badge>
            )}
          </Button>
          {(search || stageFilter !== "all" || corretorFilter !== "all" || extraFiltersActive) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
          {showExtraFilters && (
            <div className="flex flex-wrap gap-2 w-full pt-2 border-t border-border/60 mt-1">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Prioridade</Label>
                <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
                  <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Interesse</Label>
                <Select value={interesseFilter} onValueChange={setInteresseFilter}>
                  <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Comprar">Comprar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Origem</Label>
                <Select value={origemFilter} onValueChange={setOrigemFilter}>
                  <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {origemOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Etapa</TableHead>
              {!isCorretor && <TableHead>Corretor</TableHead>}
              <TableHead>Renda</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isCorretor ? 8 : 9} className="h-24 text-center text-sm text-muted-foreground">
                  Carregando leads...
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isCorretor ? 8 : 9} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum lead encontrado com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((l) => {
              const stage = funnelStages.find((s) => s.id === l.stage)
                ?? { id: l.stage, name: l.stage, color: "bg-slate-200 text-slate-700" };
              return (
                <TableRow key={l.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {l.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{l.nome}</div>
                        <div className="text-xs text-muted-foreground">{l.telefone}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{l.origem}</TableCell>
                  <TableCell><Badge variant="outline">{l.interesse}</Badge></TableCell>
                  <TableCell><Badge className={stage.color}>{stage.name}</Badge></TableCell>
                  {!isCorretor && <TableCell className="text-sm">{l.corretor}</TableCell>}
                  <TableCell className="text-sm font-medium">
                    {l.renda != null ? brl(l.renda) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={prioridadeBadgeClass(l.prioridade)}>{l.prioridade}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.updatedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="WhatsApp"
                        onClick={() => toast.message(`WhatsApp — ${l.nome}`, { description: l.telefone })}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Ligar"
                        onClick={() => toast.message(`Ligar — ${l.nome}`, { description: l.telefone })}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="E-mail"
                        onClick={() => toast.message(`E-mail — ${l.nome}`, { description: l.email })}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Mais opções">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setDetailLead(l)}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(l)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteLead(l)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={importHelpOpen} onOpenChange={setImportHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar leads</DialogTitle>
            <DialogDescription>
              Use o padrão abaixo para o arquivo ser lido corretamente.
              Preferível Excel (.xlsx).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1.5">Colunas (nessa ordem)</p>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th className="p-2 font-medium">Data Captura</th>
                      <th className="p-2 font-medium">Nome do Cliente</th>
                      <th className="p-2 font-medium">Telefone</th>
                      <th className="p-2 font-medium">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t text-muted-foreground">
                      <td className="p-2">02/08/2026</td>
                      <td className="p-2">Maria Silva</td>
                      <td className="p-2 tabular-nums">(81) 98888-7777</td>
                      <td className="p-2">WhatsApp</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-medium mb-1.5">Regras</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  <span className="text-foreground">Nome do Cliente</span> e{" "}
                  <span className="text-foreground">Telefone</span> são
                  obrigatórios
                </li>
                <li>
                  Telefone já com DDD, ex.: (81) 98888-7777 ou 81 98888-7777
                </li>
                <li>Data Captura e Origem são opcionais</li>
                <li>Uma linha = um lead</li>
              </ul>
            </div>

            <div>
              <p className="font-medium mb-1.5">Não incluir</p>
              <p className="text-muted-foreground">
                Hora da captura, DDD em coluna separada, imóvel de interesse,
                mensagem de captura, etapa, corretor ou prioridade.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadImportTemplate()}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Baixar modelo Excel
            </Button>
            <Button
              type="button"
              disabled={importParsing}
              onClick={() => importInputRef.current?.click()}
            >
              {importParsing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Escolher arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {importFileName
                ? `Arquivo: ${importFileName}. `
                : ""}
              Formato: Data Captura, Nome do Cliente, Telefone (com DDD) e
              Origem. Hora, e-mail, imóvel e mensagem são ignorados.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0 border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-left text-muted-foreground border-b">
                  <th className="p-2 font-medium">Nome</th>
                  <th className="p-2 font-medium">Telefone</th>
                  <th className="p-2 font-medium">Origem</th>
                  <th className="p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((row, index) => (
                  <tr
                    key={`${row.telefone}-${index}`}
                    className={cn(
                      "border-b last:border-0",
                      row.error && "bg-destructive/5",
                    )}
                  >
                    <td className="p-2">{row.nome || "—"}</td>
                    <td className="p-2 tabular-nums">{row.telefone || "—"}</td>
                    <td className="p-2">{row.origem || "—"}</td>
                    <td className="p-2">
                      {row.error ? (
                        <span className="text-xs text-destructive">
                          {row.error}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {importRows.filter((r) => !r.error).length} válido(s) ·{" "}
            {importRows.filter((r) => r.error).length} inválido(s) (serão
            ignorados)
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={importSaving}
              onClick={() => setImportOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                importSaving || importRows.every((r) => Boolean(r.error))
              }
              onClick={() => void confirmImport()}
            >
              {importSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Importar válidos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
