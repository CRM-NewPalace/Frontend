import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { getSession } from "@/lib/mock-auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCorretores } from "@/lib/corretores-store";
import { FUNIL_STAGES, type Lead } from "@/lib/mock-data";
import {
  Plus, MoreHorizontal, Eye, Pencil, Trash2, UserPlus, MapPin, Sparkles, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Imob CRM" }] }),
  component: Clientes,
});

const INTERESSES: Lead["interesse"][] = ["Comprar", "Alugar", "Investir"];
const ORIGENS = ["Site", "Facebook Ads", "Google Ads", "Instagram", "WhatsApp", "Indicação", "OLX", "Portal Zap"];
const TAG_OPTIONS = ["Quente", "Frio", "VIP", "Retorno", "Investidor", "Primeira compra"];
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
  corretor: string;
  tags: string[];
};

type FormMode = "create" | "edit";

function emptyForm(corretorDefault: string): FormState {
  return {
    nome: "",
    telefone: "",
    email: "",
    origem: "WhatsApp",
    interesse: "Comprar",
    faixa: "R$ 300k - 500k",
    cidade: "Recife",
    bairro: "",
    corretor: corretorDefault,
    tags: [],
  };
}

function leadToForm(lead: Lead): FormState {
  return {
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    origem: lead.origem,
    interesse: lead.interesse,
    faixa: lead.faixa,
    cidade: lead.cidade,
    bairro: lead.bairro,
    corretor: lead.corretor,
    tags: [...lead.tags],
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

function todayLabel() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

function stageName(stage: Lead["stage"]) {
  return FUNIL_STAGES.find((s) => s.id === stage)?.name ?? stage;
}

function Clientes() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const defaultCorretor = isCorretor && user ? user.name : "Marina Alves";

  const { leads: allLeads, addLead, updateLead, deleteLead } = useLeads();
  const { corretores } = useCorretores();

  const clientes = useMemo(
    () =>
      isCorretor && user
        ? allLeads.filter((l) => l.corretor === user.name)
        : allLeads,
    [allLeads, isCorretor, user],
  );

  const corretorOptions = useMemo(
    () =>
      corretores
        .filter((c) => c.status === "Ativo")
        .map((c) => c.nome),
    [corretores],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCorretor));

  const [detail, setDetail] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm(isCorretor ? defaultCorretor : (corretorOptions[0] ?? defaultCorretor)));
    setFormOpen(true);
  }

  function openEdit(l: Lead) {
    setFormMode("edit");
    setEditingId(l.id);
    setForm(leadToForm(l));
    setFormOpen(true);
    setDetail(null);
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const email = form.email.trim();
    const cidade = form.cidade.trim() || "Recife";
    const bairro = form.bairro.trim() || "—";
    const corretor = isCorretor ? defaultCorretor : form.corretor;

    if (!nome || !telefone || !email) {
      toast.error("Preencha nome, telefone e e-mail.");
      return;
    }
    if (!corretor) {
      toast.error("Selecione o corretor responsável.");
      return;
    }

    if (formMode === "create") {
      const novo: Lead = {
        id: `L${Date.now()}`,
        nome,
        telefone,
        email,
        origem: form.origem,
        interesse: form.interesse,
        faixa: form.faixa,
        cidade,
        bairro,
        corretor,
        stage: "novo",
        prioridade: "Média",
        valor: 0,
        updatedAt: todayLabel(),
        tags: form.tags,
      };
      addLead(novo);
      toast.success(`Cliente "${nome}" cadastrado.`);
    } else if (editingId) {
      updateLead(editingId, {
        nome,
        telefone,
        email,
        origem: form.origem,
        interesse: form.interesse,
        faixa: form.faixa,
        cidade,
        bairro,
        corretor,
        tags: form.tags,
      });
      toast.success("Cliente atualizado.");
    }

    setFormOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteLead(deleteTarget.id);
    toast.success(`Cliente "${deleteTarget.nome}" excluído.`);
    if (detail?.id === deleteTarget.id) setDetail(null);
    setDeleteTarget(null);
  }

  return (
    <div>
      <PageHeader
        title={isCorretor ? "Meus clientes" : "Clientes"}
        description={
          isCorretor
            ? "Clientes e contatos atribuídos a você."
            : "Clientes e contatos de toda a equipe de corretores."
        }
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Novo cliente
          </Button>
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Cidade</TableHead>
              {!isCorretor && <TableHead>Corretor</TableHead>}
              <TableHead>Tags</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((l) => (
              <TableRow
                key={l.id}
                className="hover:bg-muted/40 cursor-pointer"
                onClick={() => setDetail(l)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials(l.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{l.nome}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{l.telefone}</TableCell>
                <TableCell><Badge variant="outline">{l.interesse}</Badge></TableCell>
                <TableCell className="text-sm">{l.bairro}{l.cidade ? `, ${l.cidade}` : ""}</TableCell>
                {!isCorretor && <TableCell className="text-sm">{l.corretor}</TableCell>}
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {l.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetail(l)}>
                        <Eye className="w-4 h-4 mr-2" />Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(l)}>
                        <Pencil className="w-4 h-4 mr-2" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(l)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {clientes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isCorretor ? 6 : 7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum cliente cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Criar / Editar */}
      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={formMode === "edit" ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar cliente" : "Novo cliente"}
        description={
          formMode === "edit"
            ? "Atualize os dados do contato."
            : "Cadastre um novo cliente na base da equipe."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(78vh,720px)]">
          <FormDialogBody>
            <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Contato">
              <div className="space-y-1.5">
                <Label htmlFor="cli-nome" className="text-xs text-muted-foreground">Nome completo</Label>
                <Input
                  id="cli-nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: João Pereira"
                  className="h-10 bg-background"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cli-tel" className="text-xs text-muted-foreground">Telefone</Label>
                  <Input
                    id="cli-tel"
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                    placeholder="(81) 99999-9999"
                    className="h-10 bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cli-email" className="text-xs text-muted-foreground">E-mail</Label>
                  <Input
                    id="cli-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="h-10 bg-background"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <Select value={form.origem} onValueChange={(v) => setForm((f) => ({ ...f, origem: v }))}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORIGENS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isCorretor && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Corretor</Label>
                    <Select value={form.corretor} onValueChange={(v) => setForm((f) => ({ ...f, corretor: v }))}>
                      <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {corretorOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        {form.corretor && !corretorOptions.includes(form.corretor) && (
                          <SelectItem value={form.corretor}>{form.corretor}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Interesse">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de interesse</Label>
                <div className="grid grid-cols-3 gap-2">
                  {INTERESSES.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, interesse: opt }))}
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
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Faixa de valor</Label>
                <Select value={form.faixa} onValueChange={(v) => setForm((f) => ({ ...f, faixa: v }))}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FAIXAS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((tag) => {
                    const active = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "bg-background text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </FormSection>

            <FormSection icon={<MapPin className="w-3.5 h-3.5 text-primary" />} title="Localização">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cli-cidade" className="text-xs text-muted-foreground">Cidade</Label>
                  <Input
                    id="cli-cidade"
                    value={form.cidade}
                    onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                    placeholder="Recife"
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cli-bairro" className="text-xs text-muted-foreground">Bairro</Label>
                  <Input
                    id="cli-bairro"
                    value={form.bairro}
                    onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                    placeholder="Boa Viagem"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>

          <FormDialogActions
            hint={
              formMode === "edit"
                ? "As alterações ficam só nesta sessão (demo)."
                : "O cliente entra na base e no funil."
            }
          >
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {formMode === "edit" ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      {/* Visualizar */}
      <FormDialogShell
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.nome ?? "Detalhes do cliente"}
        description={
          detail ? (
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{detail.interesse}</Badge>
              <span>{stageName(detail.stage)}</span>
            </span>
          ) : undefined
        }
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Contato">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField label="E-mail" value={detail.email} />
                  <DetailField label="Origem" value={detail.origem} />
                  {!isCorretor && <DetailField label="Corretor" value={detail.corretor} />}
                </div>
              </FormSection>
              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Interesse">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField label="Faixa" value={detail.faixa} />
                  {detail.tags.length > 0 && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <div className="text-xs text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
              <FormSection icon={<MapPin className="w-3.5 h-3.5 text-primary" />} title="Localização">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Cidade" value={detail.cidade} />
                  <DetailField label="Bairro" value={detail.bairro} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint={`Atualizado em ${detail.updatedAt}`}>
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
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.nome}" será removido da base (também some de leads e funil).`
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
    </div>
  );
}
