import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
  DetailField,
} from "@/components/form-dialog";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import { LostMotivoFields } from "@/components/lost-motivo-fields";
import { brl, type Lead } from "@/lib/crm-types";
import {
  formatPhone,
  isValidPhone,
  phoneDigits,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import { displayEmail, isPlaceholderEmail } from "@/lib/email";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Zone Connection" }] }),
  component: Clientes,
});

type FormState = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  /** Renda mensal do cliente (opcional); só dígitos no input. */
  renda: string;
  cidade: string;
  bairro: string;
  corretor: string;
  tags: string[];
};

type FormMode = "create" | "edit";

function emptyForm(corretorDefault: string, origemDefault = ""): FormState {
  return {
    nome: "",
    telefone: "",
    email: "",
    origem: origemDefault,
    interesse: "Comprar",
    renda: "",
    cidade: "Recife",
    bairro: "",
    corretor: corretorDefault,
    tags: [],
  };
}

function leadToForm(lead: Lead): FormState {
  return {
    nome: lead.nome,
    telefone: formatPhone(lead.telefone),
    email: isPlaceholderEmail(lead.email) ? "" : lead.email,
    origem: lead.origem,
    interesse: lead.interesse,
    renda: lead.renda != null ? String(lead.renda) : "",
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

function Clientes() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;

  const {
    leads: allLeads,
    addLead,
    updateLead,
    markLeadLost,
    resolveCorretorId,
    assignees,
    loading,
  } = useLeads();
  const {
    funnelStages,
    origens: origemOptions,
    tags: tagOptions,
    colorByLabel,
  } = useCatalog();

  const stageName = (stage: Lead["stage"]) =>
    funnelStages.find((s) => s.id === stage)?.name ?? stage;

  const clientes = useMemo(() => {
    const scoped =
      isCorretor && user
        ? allLeads.filter(
            (l) => l.corretor === user.name || l.corretorId === user.id,
          )
        : allLeads;
    return scoped.filter((l) => l.tipo === "cliente");
  }, [allLeads, isCorretor, user]);

  const corretorOptions = useMemo(
    () =>
      assignees
        .filter((a) => !a.role || a.role === "corretor")
        .map((a) => a.name),
    [assignees],
  );

  const defaultCorretor =
    isCorretor && user ? user.name : (corretorOptions[0] ?? "");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(""));

  const [detail, setDetail] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleteMotivoOutro, setDeleteMotivoOutro] = useState("");

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(
      emptyForm(
        isCorretor ? defaultCorretor : (corretorOptions[0] ?? defaultCorretor),
      ),
    );
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
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const email = form.email.trim();
    const cidade = form.cidade.trim() || "Recife";
    const bairro = form.bairro.trim() || "—";
    const corretorNome = isCorretor ? defaultCorretor : form.corretor;

    if (!nome || !telefone) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido ou deixe em branco.");
      return;
    }
    if (!isValidPhone(telefone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (form.origem && !origemOptions.includes(form.origem)) {
      toast.error("Selecione uma origem válida ou deixe em branco.");
      return;
    }
    if (!corretorNome) {
      toast.error("Selecione o corretor responsável.");
      return;
    }

    const corretorId = isCorretor ? undefined : resolveCorretorId(corretorNome);
    const rendaDigits = String(form.renda).replace(/\D/g, "");
    const rendaNum = rendaDigits ? Number(rendaDigits) : null;
    const emailFinal =
      email || `contato.${phoneDigits(telefone)}@sem-email.local`;
    const origemFinal = form.origem.trim() || "Não informado";

    try {
      if (formMode === "create") {
        setFormOpen(false);
        toast.success(`Cliente "${nome}" cadastrado.`);
        await addLead({
          tipo: "cliente",
          nome,
          telefone,
          email: emailFinal,
          origem: origemFinal,
          interesse: form.interesse,
          cidade,
          bairro,
          prioridade: "Média",
          ...(rendaNum != null ? { renda: rendaNum } : {}),
          tags: form.tags,
          ...(corretorId ? { corretorId } : {}),
        });
      } else if (editingId) {
        setFormOpen(false);
        toast.success("Cliente atualizado.");
        await updateLead(editingId, {
          nome,
          telefone,
          email: emailFinal,
          origem: origemFinal,
          interesse: form.interesse,
          cidade,
          bairro,
          renda: rendaNum,
          tags: form.tags,
          ...(corretorId ? { corretorId } : {}),
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o cliente.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const motivo =
      deleteMotivo === "__outro__"
        ? deleteMotivoOutro.trim()
        : deleteMotivo.trim();
    if (!motivo) {
      toast.error("Selecione ou informe o motivo da exclusão.");
      return;
    }
    try {
      const id = deleteTarget.id;
      const nome = deleteTarget.nome;
      if (detail?.id === id) setDetail(null);
      setDeleteTarget(null);
      setDeleteMotivo("");
      setDeleteMotivoOutro("");
      toast.success(`Cliente "${nome}" excluído da carteira.`);
      await markLeadLost(id, motivo);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir o cliente.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        title={isCorretor ? "Meus clientes" : "Clientes"}
        description={
          loading
            ? "Carregando clientes..."
            : isCorretor
              ? "Sua carteira pessoal de clientes — também aparece no funil."
              : "Clientes da carteira dos corretores (não misturam com leads de captação)."
        }
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo cliente
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
                      {displayEmail(l.email) ? (
                        <div className="text-xs text-muted-foreground">
                          {displayEmail(l.email)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{l.telefone}</TableCell>
                <TableCell>
                  <Badge variant="outline">{l.interesse}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {l.bairro}
                  {l.cidade ? `, ${l.cidade}` : ""}
                </TableCell>
                {!isCorretor && (
                  <TableCell className="text-sm">{l.corretor}</TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {l.tags.map((t) => (
                      <Badge
                        key={t}
                        className={`text-[10px] ${colorByLabel("tag", t)}`}
                      >
                        {t}
                      </Badge>
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
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(l)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(l)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
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
        icon={
          formMode === "edit" ? (
            <Pencil className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )
        }
        title={formMode === "edit" ? "Editar cliente" : "Novo cliente"}
        description={
          formMode === "edit"
            ? "Atualize os dados do contato."
            : "Cadastre um novo cliente na base da equipe."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection
              icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
              title="Contato"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="cli-nome"
                  className="text-xs text-muted-foreground"
                >
                  Nome completo
                </Label>
                <Input
                  id="cli-nome"
                  value={form.nome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  placeholder="Ex.: João Pereira"
                  className="h-10 bg-background"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-tel"
                    className="text-xs text-muted-foreground"
                  >
                    Telefone
                  </Label>
                  <Input
                    id="cli-tel"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.telefone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        telefone: formatPhone(e.target.value),
                      }))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                    className="h-10 bg-background"
                    maxLength={15}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-email"
                    className="text-xs text-muted-foreground"
                  >
                    E-mail{" "}
                    <span className="font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="cli-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="email@exemplo.com"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Origem <span className="font-normal">(opcional)</span>
                  </Label>
                  <Select
                    value={form.origem || "__none__"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        origem: v === "__none__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem origem</SelectItem>
                      {origemOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                      {formMode === "edit" &&
                        form.origem &&
                        !origemOptions.includes(form.origem) && (
                          <SelectItem value={form.origem}>
                            {form.origem}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                {!isCorretor && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Corretor
                    </Label>
                    <Select
                      value={form.corretor}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, corretor: v }))
                      }
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {corretorOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                        {form.corretor &&
                          !corretorOptions.includes(form.corretor) && (
                            <SelectItem value={form.corretor}>
                              {form.corretor}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection
              icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
              title="Interesse"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="cli-renda"
                  className="text-xs text-muted-foreground"
                >
                  Renda mensal <span className="font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="cli-renda"
                    inputMode="numeric"
                    value={form.renda}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        renda: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    placeholder="Ex.: 8500"
                    className="h-10 bg-background pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tagOptions.map((tag) => {
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

            <FormSection
              icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
              title="Localização"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-cidade"
                    className="text-xs text-muted-foreground"
                  >
                    Cidade
                  </Label>
                  <Input
                    id="cli-cidade"
                    value={form.cidade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cidade: e.target.value }))
                    }
                    placeholder="Recife"
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-bairro"
                    className="text-xs text-muted-foreground"
                  >
                    Bairro
                  </Label>
                  <Input
                    id="cli-bairro"
                    value={form.bairro}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bairro: e.target.value }))
                    }
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
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setFormOpen(false)}
            >
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
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detail.email) || "—"}
                  />
                  <DetailField label="Origem" value={detail.origem} />
                  {!isCorretor && (
                    <DetailField label="Corretor" value={detail.corretor} />
                  )}
                </div>
              </FormSection>
              <FormSection
                icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                title="Interesse e renda"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField
                    label="Renda mensal"
                    value={detail.renda != null ? brl(detail.renda) : "—"}
                  />
                  {detail.tags.length > 0 && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <div className="text-xs text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tags.map((t) => (
                          <Badge
                            key={t}
                            className={`text-[10px] ${colorByLabel("tag", t)}`}
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
              <FormSection
                icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
                title="Localização"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Cidade" value={detail.cidade} />
                  <DetailField label="Bairro" value={detail.bairro} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint={`Atualizado em ${detail.updatedAt}`}>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => openEdit(detail)}
              >
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
              <Button
                variant="destructive"
                className="flex-1 sm:flex-none"
                onClick={() => setDeleteTarget(detail)}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      {/* Excluir cliente da carteira (não vai para Leads Perdidos) */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteMotivo("");
            setDeleteMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Por que está excluindo este cliente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.nome}" será removido da carteira. Clientes não vão para Leads Perdidos.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={deleteMotivo}
              outroValue={deleteMotivoOutro}
              onChange={setDeleteMotivo}
              onOutroChange={setDeleteMotivoOutro}
              selectId="cli-lost-motivo"
              outroId="cli-motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
