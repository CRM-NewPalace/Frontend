import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Search, Filter, Download, MoreHorizontal, Phone, MessageSquare, Mail,
  UserPlus, MapPin, Wallet, Sparkles, Eye, Pencil, Trash2, X,
} from "lucide-react";
import { FUNIL_STAGES, CORRETORES, brl, type Lead } from "@/lib/mock-data";
import { getSession } from "@/lib/mock-auth";
import { useLeads } from "@/lib/leads-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/leads")({
  head: () => ({ meta: [{ title: "Leads — Imob CRM" }] }),
  component: LeadsPage,
});

const ORIGENS = ["Site", "Facebook Ads", "Google Ads", "Indicação", "OLX", "Portal Zap", "WhatsApp", "Instagram"];
const FAIXAS = [
  "R$ 125k - 200k",
  "R$ 200k - 300k",
  "R$ 300k - 500k",
  "R$ 500k - 800k",
  "R$ 800k - 1.2M",
  "R$ 1.2M+",
];

type FormState = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  faixa: string;
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  temperatura: "Quente" | "Morno" | "Frio";
  valor: string;
  corretor: string;
};

const emptyForm = (corretorDefault: string): FormState => ({
  nome: "",
  telefone: "",
  email: "",
  origem: "WhatsApp",
  interesse: "Comprar",
  faixa: "R$ 500k - 800k",
  cidade: "",
  bairro: "",
  prioridade: "Média",
  temperatura: "Morno",
  valor: "",
  corretor: corretorDefault,
});

type FormMode = "create" | "edit";

function leadToForm(lead: Lead): FormState {
  const temp = (["Quente", "Morno", "Frio"] as const).find((t) => lead.tags.includes(t)) ?? "Morno";
  return {
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    origem: lead.origem,
    interesse: lead.interesse,
    faixa: lead.faixa,
    cidade: lead.cidade,
    bairro: lead.bairro,
    prioridade: lead.prioridade,
    temperatura: temp,
    valor: lead.valor ? String(lead.valor) : "",
    corretor: lead.corretor,
  };
}

function LeadsPage() {
  const user = getSession();
  const isCorretor = user?.role === "corretor";
  const defaultCorretor = isCorretor && user ? user.name : "Marina Alves";

  const { leads: allLeads, addLead, updateLead, deleteLead: removeLead } = useLeads();
  const leads = isCorretor && user
    ? allLeads.filter((l) => l.corretor === user.name)
    : allLeads;

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCorretor));
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [corretorFilter, setCorretorFilter] = useState<string>("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("all");
  const [interesseFilter, setInteresseFilter] = useState<string>("all");
  const [origemFilter, setOrigemFilter] = useState<string>("all");

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (q) {
        const hay = `${l.nome} ${l.email} ${l.telefone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!isCorretor && corretorFilter !== "all" && l.corretor !== corretorFilter) return false;
      if (prioridadeFilter !== "all" && l.prioridade !== prioridadeFilter) return false;
      if (interesseFilter !== "all" && l.interesse !== interesseFilter) return false;
      if (origemFilter !== "all" && l.origem !== origemFilter) return false;
      return true;
    });
  }, [leads, search, stageFilter, corretorFilter, prioridadeFilter, interesseFilter, origemFilter, isCorretor]);

  const extraFiltersActive =
    prioridadeFilter !== "all" || interesseFilter !== "all" || origemFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStageFilter("all");
    setCorretorFilter("all");
    setPrioridadeFilter("all");
    setInteresseFilter("all");
    setOrigemFilter("all");
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm(defaultCorretor));
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const email = form.email.trim();

    if (!nome || !telefone || !email) {
      toast.error("Preencha nome, telefone e e-mail.");
      return;
    }

    const valorNum = Number(String(form.valor).replace(/\D/g, "")) || 0;
    const today = new Date();
    const updatedAt = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    const corretor = isCorretor ? defaultCorretor : form.corretor;
    const otherTags = formMode === "edit" && editingId
      ? (leads.find((l) => l.id === editingId)?.tags.filter((t) => !["Quente", "Morno", "Frio"].includes(t)) ?? [])
      : [];

    if (formMode === "edit" && editingId) {
      updateLead(editingId, {
        nome,
        telefone,
        email,
        origem: form.origem,
        interesse: form.interesse,
        faixa: form.faixa,
        cidade: form.cidade.trim(),
        bairro: form.bairro.trim(),
        corretor,
        prioridade: form.prioridade,
        valor: valorNum,
        updatedAt,
        tags: [form.temperatura, ...otherTags],
      });
      setOpen(false);
      toast.success(`Lead ${nome} atualizado.`);
      return;
    }

    const novo: Lead = {
      id: `L${Date.now()}`,
      nome,
      telefone,
      email,
      origem: form.origem,
      interesse: form.interesse,
      faixa: form.faixa,
      cidade: form.cidade.trim(),
      bairro: form.bairro.trim(),
      corretor,
      stage: "novo",
      prioridade: form.prioridade,
      valor: valorNum,
      updatedAt,
      tags: [form.temperatura],
    };

    addLead(novo);
    setOpen(false);
    toast.success(`Lead ${nome} criado com sucesso.`);
  }

  function confirmDelete() {
    if (!deleteLead) return;
    removeLead(deleteLead.id);
    toast.success(`Lead ${deleteLead.nome} excluído.`);
    setDeleteLead(null);
  }

  return (
    <div>
      <PageHeader
        title={isCorretor ? "Meus leads" : "Leads"}
        description={
          filteredLeads.length === leads.length
            ? isCorretor
              ? `${leads.length} leads atribuídos a você`
              : `${leads.length} leads ativos no funil`
            : `${filteredLeads.length} de ${leads.length} leads`
        }
        actions={
          <>
            {!isCorretor && (
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Exportar</Button>
            )}
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />Novo lead
            </Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {formMode === "edit" ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </div>
              <div className="space-y-1 pr-6">
                <DialogTitle className="text-lg tracking-tight">
                  {formMode === "edit" ? "Editar lead" : "Novo lead"}
                </DialogTitle>
                <DialogDescription>
                  {formMode === "edit"
                    ? "Atualize os dados do contato no funil."
                    : "Preencha os dados para adicionar o contato ao funil."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(78vh,720px)]">
            <div className="overflow-y-auto px-6 py-5 space-y-5">
              <section className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Contato
                </div>
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
                      value={form.telefone}
                      onChange={(e) => setField("telefone", e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="h-10 bg-background"
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
                    <Select value={form.origem} onValueChange={(v) => setField("origem", v)}>
                      <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isCorretor ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Corretor</Label>
                      <Select value={form.corretor} onValueChange={(v) => setField("corretor", v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CORRETORES.filter((c) => c.status === "Ativo").map((c) => (
                            <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                          ))}
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
              </section>

              <section className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  Interesse e valor
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo de interesse</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Comprar", "Alugar", "Investir"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setField("interesse", opt)}
                        className={cn(
                          "h-10 rounded-lg border text-sm font-medium transition-colors",
                          form.interesse === opt
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "bg-background text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Faixa de valor</Label>
                    <Select value={form.faixa} onValueChange={(v) => setField("faixa", v)}>
                      <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FAIXAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-valor" className="text-xs text-muted-foreground">Valor estimado</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">R$</span>
                      <Input
                        id="lead-valor"
                        inputMode="numeric"
                        value={form.valor}
                        onChange={(e) => setField("valor", e.target.value.replace(/\D/g, ""))}
                        placeholder="650000"
                        className="h-10 bg-background pl-9"
                      />
                    </div>
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
              </section>

              <section className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Localização
                </div>
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
              </section>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30 sm:justify-between gap-3">
              <p className="text-xs text-muted-foreground hidden sm:block">
                {formMode === "edit"
                  ? "As alterações ficam só nesta sessão (demo)."
                  : <>O lead entra na etapa <span className="font-medium text-foreground">Novo Lead</span>.</>}
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
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
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailLead} onOpenChange={(o) => !o && setDetailLead(null)}>
        <DialogContent className="sm:max-w-md">
          {detailLead && (
            <>
              <DialogHeader>
                <DialogTitle>{detailLead.nome}</DialogTitle>
                <DialogDescription>
                  {FUNIL_STAGES.find((s) => s.id === detailLead.stage)?.name} · {detailLead.prioridade}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm py-2">
                <div><div className="text-xs text-muted-foreground">Telefone</div><div className="font-medium">{detailLead.telefone}</div></div>
                <div><div className="text-xs text-muted-foreground">E-mail</div><div className="font-medium truncate">{detailLead.email}</div></div>
                <div><div className="text-xs text-muted-foreground">Origem</div><div className="font-medium">{detailLead.origem}</div></div>
                <div><div className="text-xs text-muted-foreground">Interesse</div><div className="font-medium">{detailLead.interesse}</div></div>
                <div><div className="text-xs text-muted-foreground">Valor</div><div className="font-medium">{brl(detailLead.valor)}</div></div>
                <div><div className="text-xs text-muted-foreground">Faixa</div><div className="font-medium">{detailLead.faixa}</div></div>
                <div><div className="text-xs text-muted-foreground">Cidade</div><div className="font-medium">{detailLead.cidade || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Bairro</div><div className="font-medium">{detailLead.bairro || "—"}</div></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailLead(null)}>Fechar</Button>
                <Button onClick={() => { const lead = detailLead; setDetailLead(null); openEdit(lead); }}>
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLead} onOpenChange={(o) => !o && setDeleteLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLead ? `Tem certeza que deseja excluir ${deleteLead.nome}?` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
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
              {FUNIL_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isCorretor && (
            <Select value={corretorFilter} onValueChange={setCorretorFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Corretor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos corretores</SelectItem>
                {CORRETORES.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(extraFiltersActive && "border-primary text-primary")}>
                <Filter className="w-4 h-4 mr-1" />
                Mais filtros
                {extraFiltersActive && (
                  <Badge className="ml-1 h-5 px-1.5 text-[10px]" variant="secondary">
                    {[prioridadeFilter, interesseFilter, origemFilter].filter((v) => v !== "all").length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3">
              <div className="text-sm font-medium">Filtros avançados</div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Interesse</Label>
                <Select value={interesseFilter} onValueChange={setInteresseFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Comprar">Comprar</SelectItem>
                    <SelectItem value="Alugar">Alugar</SelectItem>
                    <SelectItem value="Investir">Investir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Origem</Label>
                <Select value={origemFilter} onValueChange={setOrigemFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setPrioridadeFilter("all");
                  setInteresseFilter("all");
                  setOrigemFilter("all");
                }}
              >
                Limpar filtros avançados
              </Button>
            </PopoverContent>
          </Popover>
          {(search || stageFilter !== "all" || corretorFilter !== "all" || extraFiltersActive) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
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
              <TableHead>Valor</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isCorretor ? 8 : 9} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum lead encontrado com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((l) => {
              const stage = FUNIL_STAGES.find((s) => s.id === l.stage)!;
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
                  <TableCell className="text-sm font-medium">{brl(l.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={l.prioridade === "Alta" ? "destructive" : "secondary"}>{l.prioridade}</Badge>
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
    </div>
  );
}
