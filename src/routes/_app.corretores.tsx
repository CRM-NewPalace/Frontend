import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { brl, GERENTES, type Corretor } from "@/lib/mock-data";
import { getSession } from "@/lib/mock-auth";
import { canViewFinancial } from "@/lib/permissions";
import { useCorretores } from "@/lib/corretores-store";
import {
  Plus, Trophy, Target, TrendingUp, MoreHorizontal, Eye, Pencil, Trash2,
  UserX, UserCheck, Users, IdCard, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/corretores")({
  head: () => ({ meta: [{ title: "Corretores — Imob CRM" }] }),
  component: Corretores,
});

const EQUIPES = ["Time Norte", "Time Sul", "Time Centro", "Time Leste", "Time Oeste"];

type PeriodoFiltro = "all" | "7d" | "30d" | "90d" | "custom";
type MetaFiltro = "all" | "bateu" | "nao_bateu";

type FormState = {
  nome: string;
  creci: string;
  telefone: string;
  email: string;
  equipe: string;
  meta: string;
  status: Corretor["status"];
};

type FormMode = "create" | "edit";

function emptyForm(): FormState {
  return {
    nome: "",
    creci: "",
    telefone: "",
    email: "",
    equipe: EQUIPES[0],
    meta: "3",
    status: "Ativo",
  };
}

function formFromCorretor(c: Corretor): FormState {
  return {
    nome: c.nome,
    creci: c.creci,
    telefone: c.telefone,
    email: c.email,
    equipe: c.equipe,
    meta: String(c.meta),
    status: c.status,
  };
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatCriadoEm(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Corretores() {
  const user = getSession();
  const showFinancial = user ? canViewFinancial(user.role) : false;
  const { corretores, addCorretor, updateCorretor, deleteCorretor, setCorretorStatus, setMetas } = useCorretores();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [detail, setDetail] = useState<Corretor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Corretor | null>(null);

  const [metaOpen, setMetaOpen] = useState(false);
  const [metaScope, setMetaScope] = useState<"all" | "selected">("all");
  const [metaValue, setMetaValue] = useState("3");
  const [metaSelected, setMetaSelected] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [equipeFilter, setEquipeFilter] = useState("all");
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFiltro>("all");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [metaFilter, setMetaFilter] = useState<MetaFiltro>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let minDate = "";
    let maxDate = "";

    if (periodoFilter === "7d") minDate = daysAgoIso(7);
    else if (periodoFilter === "30d") minDate = daysAgoIso(30);
    else if (periodoFilter === "90d") minDate = daysAgoIso(90);
    else if (periodoFilter === "custom") {
      minDate = dataDe;
      maxDate = dataAte;
    }

    return corretores.filter((c) => {
      if (q) {
        const hay = `${c.nome} ${c.email} ${c.creci} ${c.equipe}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (equipeFilter !== "all" && c.equipe !== equipeFilter) return false;
      if (minDate && c.criadoEm < minDate) return false;
      if (maxDate && c.criadoEm > maxDate) return false;
      if (metaFilter === "bateu" && c.vendas < c.meta) return false;
      if (metaFilter === "nao_bateu" && c.vendas >= c.meta) return false;
      return true;
    });
  }, [corretores, search, equipeFilter, periodoFilter, dataDe, dataAte, metaFilter]);

  const filtersActive =
    search.trim() !== "" ||
    equipeFilter !== "all" ||
    periodoFilter !== "all" ||
    metaFilter !== "all";

  function clearFilters() {
    setSearch("");
    setEquipeFilter("all");
    setPeriodoFilter("all");
    setDataDe("");
    setDataAte("");
    setMetaFilter("all");
  }

  const stats = useMemo(
    () => ({
      total: filtered.length,
      meta: filtered.reduce((s, c) => s + c.meta, 0),
      vendas: filtered.reduce((s, c) => s + c.vendas, 0),
    }),
    [filtered],
  );

  const ativos = useMemo(
    () => corretores.filter((c) => c.status === "Ativo"),
    [corretores],
  );

  const equipesDisponiveis = useMemo(() => {
    const set = new Set([...EQUIPES, ...corretores.map((c) => c.equipe)]);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [corretores]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openMetas() {
    setMetaScope("all");
    setMetaValue("3");
    setMetaSelected(ativos.map((c) => c.id));
    setMetaOpen(true);
  }

  function toggleMetaSelected(id: string) {
    setMetaSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSetMetas(e: React.FormEvent) {
    e.preventDefault();
    const meta = Number(metaValue);
    if (!Number.isFinite(meta) || meta < 1) {
      toast.error("Informe uma meta mensal válida (mínimo 1).");
      return;
    }

    if (metaScope === "all") {
      setMetas(meta);
      toast.success(`Meta da gerência de ${meta} vendas definida para todos.`);
    } else {
      if (metaSelected.length === 0) {
        toast.error("Selecione ao menos um corretor.");
        return;
      }
      setMetas(meta, metaSelected);
      toast.success(
        `Meta da gerência de ${meta} vendas definida para ${metaSelected.length} corretor${metaSelected.length > 1 ? "es" : ""}.`,
      );
    }
    setMetaOpen(false);
  }

  function openEdit(c: Corretor) {
    setFormMode("edit");
    setEditingId(c.id);
    setForm(formFromCorretor(c));
    setFormOpen(true);
    setDetail(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const creci = form.creci.trim();
    const telefone = form.telefone.trim();
    const email = form.email.trim();
    const meta = Number(form.meta);

    if (!nome || !creci || !telefone || !email) {
      toast.error("Preencha nome, CRECI, telefone e e-mail.");
      return;
    }
    if (!Number.isFinite(meta) || meta < 1) {
      toast.error("Informe uma meta mensal válida.");
      return;
    }

    if (formMode === "create") {
      const gerente =
        GERENTES.find((g) => g.equipes.includes(form.equipe))?.nome ?? "Carlos Lima";
      addCorretor({
        id: `c${Date.now()}`,
        nome,
        creci: creci.toUpperCase().startsWith("CRECI") ? creci : `CRECI ${creci}`,
        telefone,
        email,
        equipe: form.equipe,
        gerente,
        meta,
        metaPessoal: meta,
        vendas: 0,
        leads: 0,
        valorVendido: 0,
        status: form.status,
        criadoEm: new Date().toISOString().slice(0, 10),
      });
      toast.success(`Corretor "${nome}" cadastrado.`);
    } else if (editingId) {
      const gerente =
        GERENTES.find((g) => g.equipes.includes(form.equipe))?.nome ?? "Carlos Lima";
      updateCorretor(editingId, {
        nome,
        creci: creci.toUpperCase().startsWith("CRECI") ? creci : `CRECI ${creci}`,
        telefone,
        email,
        equipe: form.equipe,
        gerente,
        meta,
        status: form.status,
      });
      toast.success("Corretor atualizado.");
    }

    setFormOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteCorretor(deleteTarget.id);
    toast.success(`Corretor "${deleteTarget.nome}" excluído.`);
    if (detail?.id === deleteTarget.id) setDetail(null);
    setDeleteTarget(null);
  }

  function toggleStatus(c: Corretor) {
    const next = c.status === "Ativo" ? "Inativo" : "Ativo";
    setCorretorStatus(c.id, next);
    toast.success(next === "Inativo" ? `${c.nome} inativado.` : `${c.nome} reativado.`);
    if (detail?.id === c.id) setDetail({ ...c, status: next });
  }

  return (
    <div>
      <PageHeader
        title="Corretores"
        description={
          filtersActive
            ? `${filtered.length} de ${corretores.length} corretores`
            : "Equipe de vendas e performance individual."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={openMetas}>
              <Target className="w-4 h-4 mr-1" />Definir metas da gerência
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />Novo corretor
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CRECI, e-mail..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={equipeFilter} onValueChange={setEquipeFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas equipes</SelectItem>
              {equipesDisponiveis.map((eq) => (
                <SelectItem key={eq} value={eq}>{eq}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={periodoFilter}
            onValueChange={(v) => setPeriodoFilter(v as PeriodoFiltro)}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer data</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Período personalizado</SelectItem>
            </SelectContent>
          </Select>
          {periodoFilter === "custom" && (
            <>
              <Input
                type="date"
                className="w-40 h-9"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
                title="De"
              />
              <Input
                type="date"
                className="w-40 h-9"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
                title="Até"
              />
            </>
          )}
          <Select
            value={metaFilter}
            onValueChange={(v) => setMetaFilter(v as MetaFiltro)}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Meta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as metas</SelectItem>
              <SelectItem value="bateu">Bateram meta gerência</SelectItem>
              <SelectItem value="nao_bateu">Não bateram meta gerência</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total de corretores", value: stats.total, icon: Trophy },
          { label: "Meta agregada", value: stats.meta, icon: Target },
          { label: "Vendas do mês", value: stats.vendas, icon: TrendingUp },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const pct = c.meta > 0 ? Math.min(100, Math.round((c.vendas / c.meta) * 100)) : 0;
          const bateuMeta = c.vendas >= c.meta;
          return (
            <Card
              key={c.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setDetail(c)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{c.nome}</div>
                      <Badge variant={c.status === "Ativo" ? "default" : "secondary"} className="text-[10px]">
                        {c.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          bateuMeta
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-warning/15 text-warning-foreground border-warning/30",
                        )}
                      >
                        {bateuMeta ? "Meta ok" : "Abaixo"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.creci}</div>
                    <div className="text-xs text-muted-foreground">{c.equipe} · desde {formatCriadoEm(c.criadoEm)}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setDetail(c)}>
                        <Eye className="w-4 h-4 mr-2" />Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <Pencil className="w-4 h-4 mr-2" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus(c)}>
                        {c.status === "Ativo" ? (
                          <><UserX className="w-4 h-4 mr-2" />Inativar</>
                        ) : (
                          <><UserCheck className="w-4 h-4 mr-2" />Reativar</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Meta gerência</span>
                      <span className="font-medium">{c.vendas}/{c.meta} vendas</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Meta pessoal</span>
                    <span className="font-medium text-foreground">{c.vendas}/{c.metaPessoal}</span>
                  </div>
                </div>

                <div className={cn("grid gap-2 mt-4 pt-4 border-t text-center", showFinancial ? "grid-cols-3" : "grid-cols-2")}>
                  <div>
                    <div className="text-lg font-semibold">{c.leads}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Leads</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{c.vendas}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Vendas</div>
                  </div>
                  {showFinancial && (
                    <div>
                      <div className="text-lg font-semibold text-primary">{brl(c.valorVendido)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Vendido</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16">
          {corretores.length === 0
            ? "Nenhum corretor cadastrado. Adicione o primeiro."
            : "Nenhum corretor encontrado com esses filtros."}
        </div>
      )}

      {/* Criar / Editar */}
      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={formMode === "edit" ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar corretor" : "Novo corretor"}
        description={
          formMode === "edit"
            ? "Atualize os dados do corretor."
            : "Cadastre um novo membro da equipe de vendas."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(78vh,720px)]">
          <FormDialogBody>
            <FormSection icon={<IdCard className="w-3.5 h-3.5 text-primary" />} title="Dados pessoais">
              <div className="space-y-1.5">
                <Label htmlFor="corretor-nome" className="text-xs text-muted-foreground">Nome completo</Label>
                <Input
                  id="corretor-nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Marina Alves"
                  className="h-10 bg-background"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="corretor-creci" className="text-xs text-muted-foreground">CRECI</Label>
                  <Input
                    id="corretor-creci"
                    value={form.creci}
                    onChange={(e) => setForm((f) => ({ ...f, creci: e.target.value }))}
                    placeholder="45678-F"
                    className="h-10 bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="corretor-telefone" className="text-xs text-muted-foreground">Telefone</Label>
                  <Input
                    id="corretor-telefone"
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                    placeholder="(81) 99999-9999"
                    className="h-10 bg-background"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corretor-email" className="text-xs text-muted-foreground">E-mail</Label>
                <Input
                  id="corretor-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="corretor@imob.com"
                  className="h-10 bg-background"
                  required
                />
              </div>
            </FormSection>

            <FormSection icon={<Users className="w-3.5 h-3.5 text-primary" />} title="Equipe">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Equipe</Label>
                  <Select value={form.equipe} onValueChange={(v) => setForm((f) => ({ ...f, equipe: v }))}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EQUIPES.map((eq) => (
                        <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="corretor-meta" className="text-xs text-muted-foreground">Meta gerência</Label>
                  <Input
                    id="corretor-meta"
                    type="number"
                    min={1}
                    value={form.meta}
                    onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))}
                    className="h-10 bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as Corretor["status"] }))}
                  >
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>
          </FormDialogBody>

          <FormDialogActions
            hint={
              formMode === "edit"
                ? "As alterações ficam só nesta sessão (demo)."
                : "O corretor entra na equipe de vendas."
            }
          >
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {formMode === "edit" ? "Salvar alterações" : "Cadastrar corretor"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      {/* Visualizar */}
      <FormDialogShell
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.nome ?? "Detalhes do corretor"}
        description={
          detail ? (
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant={detail.status === "Ativo" ? "default" : "secondary"} className="text-[10px]">
                {detail.status}
              </Badge>
              <span>{detail.equipe}</span>
            </span>
          ) : undefined
        }
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection icon={<IdCard className="w-3.5 h-3.5 text-primary" />} title="Dados pessoais">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="CRECI" value={detail.creci} />
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField label="E-mail" value={detail.email} className="sm:col-span-2" />
                </div>
              </FormSection>
              <FormSection icon={<Users className="w-3.5 h-3.5 text-primary" />} title="Equipe">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Equipe" value={detail.equipe} />
                  <DetailField label="Status" value={detail.status} />
                  <DetailField label="Cadastrado em" value={formatCriadoEm(detail.criadoEm)} />
                  <DetailField label="Meta gerência" value={`${detail.vendas}/${detail.meta} vendas`} />
                  <DetailField label="Meta pessoal" value={`${detail.vendas}/${detail.metaPessoal} vendas`} />
                  <DetailField label="Leads" value={detail.leads} />
                  <DetailField label="Vendas" value={detail.vendas} />
                  {showFinancial && (
                    <DetailField label="Valor vendido" value={brl(detail.valorVendido)} />
                  )}
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso da meta</span>
                    <span className="font-medium">
                      {detail.meta > 0 ? Math.min(100, Math.round((detail.vendas / detail.meta) * 100)) : 0}%
                    </span>
                  </div>
                  <Progress value={detail.meta > 0 ? Math.min(100, Math.round((detail.vendas / detail.meta) * 100)) : 0} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => toggleStatus(detail)}>
                {detail.status === "Ativo" ? (
                  <><UserX className="w-4 h-4" />Inativar</>
                ) : (
                  <><UserCheck className="w-4 h-4" />Reativar</>
                )}
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => openEdit(detail)}>
                <Pencil className="w-4 h-4" />Editar
              </Button>
              <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => setDeleteTarget(detail)}>
                <Trash2 className="w-4 h-4" />Excluir
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      {/* Excluir */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir corretor?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Isso removerá permanentemente "${deleteTarget.nome}" da equipe. Essa ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Definir metas */}
      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-6">
                <DialogTitle className="text-lg tracking-tight">Definir metas da gerência</DialogTitle>
                <DialogDescription>
                  Meta oficial atribuída pela gerência. A meta pessoal de cada corretor fica em Metas.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSetMetas} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="meta-valor">Meta da gerência (vendas)</Label>
              <Input
                id="meta-valor"
                type="number"
                min={1}
                value={metaValue}
                onChange={(e) => setMetaValue(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Aplicar para</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetaScope("all")}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-medium transition-colors",
                    metaScope === "all"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setMetaScope("selected")}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-medium transition-colors",
                    metaScope === "selected"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  Específicos
                </button>
              </div>
            </div>

            {metaScope === "selected" && (
              <div className="space-y-2 rounded-xl border p-3 max-h-52 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {metaSelected.length} selecionado{metaSelected.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      setMetaSelected(
                        metaSelected.length === corretores.length
                          ? []
                          : corretores.map((c) => c.id),
                      )
                    }
                  >
                    {metaSelected.length === corretores.length ? "Limpar" : "Selecionar todos"}
                  </button>
                </div>
                {corretores.map((c) => {
                  const checked = metaSelected.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleMetaSelected(c.id)}
                      />
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {initials(c.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{c.nome}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Meta atual: {c.meta} · {c.status}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMetaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Target className="w-4 h-4" />
                Aplicar meta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
