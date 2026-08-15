import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isCorretorLike } from "@/lib/permissions";
import {
  createEquipe,
  deleteEquipe,
  fetchEquipeCorretores,
  fetchEquipeGerentes,
  fetchEquipes,
  updateEquipe,
  type Equipe,
  type EquipeMember,
  type EquipeOptionUser,
} from "@/lib/equipes-api";
import { resetUserPassword } from "@/lib/users-api";
import {
  Network,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Users,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Crown,
  KeyRound,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
export const Route = createFileRoute("/_app/equipes")({
  head: () => ({ meta: [{ title: "Equipes — Zone Connection" }] }),
  component: EquipesPage,
});

/** Largura da coluna (w-72) + gap (gap-3). */
const COLUMN_STEP_PX = 288 + 12;

type FormState = {
  name: string;
  gerenteId: string;
  membroIds: string[];
  status: "ativo" | "inativo";
};

const emptyForm = (): FormState => ({
  name: "",
  gerenteId: "",
  membroIds: [],
  status: "ativo",
});

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberCard({
  member,
  roleLabel,
  accent,
  onResetPassword,
  resetting,
}: {
  member: EquipeMember;
  roleLabel: string;
  accent?: boolean;
  onResetPassword?: () => void;
  resetting?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-3 shadow-sm border-[#079ED4]/15 bg-[#e8f6fc]",
        accent && "border-primary/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback
            className={cn(
              "text-[11px] font-semibold",
              accent
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {accent && <Crown className="w-3 h-3 text-primary shrink-0" />}
                <div className="table-person-name text-sm truncate">
                  {member.name}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {member.email}
              </div>
            </div>
            {onResetPassword && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                title="Gerar senha temporária"
                disabled={resetting}
                onClick={onResetPassword}
              >
                {resetting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              STATUS_CHIP_CLASS,
              "mt-2 capitalize",
              accent && "border-primary/30 text-primary",
            )}
            title={roleLabel}
          >
            {roleLabel}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function EquipesPage() {
  const session = getSession();
  const canManage = session?.role === "admin";
  const canResetMemberPassword =
    session?.role === "admin" || session?.role === "gerente";

  const [items, setItems] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(
    null,
  );

  const [gerentes, setGerentes] = useState<EquipeOptionUser[]>([]);
  const [corretores, setCorretores] = useState<EquipeOptionUser[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchEquipes());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as equipes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const updateScrollButtons = useCallback(() => {
    const el = boardRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [items.length, updateScrollButtons]);

  function scrollBoard(dir: -1 | 1) {
    boardRef.current?.scrollBy({
      left: dir * COLUMN_STEP_PX,
      behavior: "smooth",
    });
  }

  async function loadOptions(equipeId?: string) {
    setOptionsLoading(true);
    try {
      const [g, c] = await Promise.all([
        fetchEquipeGerentes(equipeId),
        fetchEquipeCorretores(equipeId),
      ]);
      setGerentes(g);
      setCorretores(c);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar gerentes/corretores.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }

  async function openCreate() {
    if (!canManage) return;
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
    await loadOptions();
  }

  async function openEdit(equipe: Equipe) {
    if (!canManage) return;
    setFormMode("edit");
    setEditingId(equipe.id);
    setForm({
      name: equipe.name,
      gerenteId: equipe.gerenteId,
      membroIds: equipe.membros.map((m) => m.id),
      status: equipe.status,
    });
    setOpen(true);
    await loadOptions(equipe.id);
  }

  function toggleMembro(id: string, checked: boolean) {
    setForm((p) => ({
      ...p,
      membroIds: checked
        ? [...p.membroIds, id]
        : p.membroIds.filter((x) => x !== id),
    }));
  }

  const gerenteOptions = useMemo(() => {
    const map = new Map(gerentes.map((g) => [g.id, g]));
    return [...map.values()];
  }, [gerentes]);

  const selectedCount = form.membroIds.length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    if (!form.name.trim()) {
      toast.error("Informe o nome da equipe.");
      return;
    }
    if (!form.gerenteId) {
      toast.error("Selecione o gerente da equipe.");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "create") {
        await createEquipe({
          name: form.name.trim(),
          gerenteId: form.gerenteId,
          membroIds: form.membroIds,
          status: form.status,
        });
        toast.success("Equipe criada.");
      } else if (editingId) {
        await updateEquipe(editingId, {
          name: form.name.trim(),
          gerenteId: form.gerenteId,
          membroIds: form.membroIds,
          status: form.status,
        });
        toast.success("Equipe atualizada.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a equipe.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!canManage || !deleteId) return;
    try {
      await deleteEquipe(deleteId);
      setDeleteId(null);
      toast.success("Equipe excluída.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a equipe.",
      );
    }
  }

  async function handleResetPassword(member: EquipeMember) {
    if (!canResetMemberPassword || !isCorretorLike(member.role)) return;
    setResettingId(member.id);
    try {
      const result = await resetUserPassword(member.id);
      if (result.temporaryPassword) {
        setCredentials({
          name: member.name,
          email: member.email,
          password: result.temporaryPassword,
        });
      } else {
        toast.success(`Senha de ${member.name} redefinida.`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível gerar a senha temporária.",
      );
    } finally {
      setResettingId(null);
    }
  }

  async function copyText(value: string, field: "email" | "password") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(field === "email" ? "E-mail copiado." : "Senha copiada.");
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Equipes"
        description={
          canManage
            ? "Quadro das equipes — cada coluna é uma equipe com gerente e corretores."
            : "Membros da sua equipe — use a chave para gerar senha temporária se alguém esquecer."
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border bg-background">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-r-none"
                disabled={!canScrollLeft}
                aria-label="Coluna anterior"
                title="Coluna anterior"
                onClick={() => scrollBoard(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-l-none"
                disabled={!canScrollRight}
                aria-label="Próxima coluna"
                title="Próxima coluna"
                onClick={() => scrollBoard(1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => void openCreate()}>
                <Plus className="w-4 h-4 mr-1" />
                Nova equipe
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando equipes...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed bg-muted/20">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Network className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {canManage
              ? "Nenhuma equipe cadastrada"
              : "Você ainda não lidera uma equipe"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {canManage
              ? "Crie a primeira equipe e vincule um gerente com corretores."
              : "Peça ao administrador para vincular você como gerente de uma equipe."}
          </p>
        </div>
      ) : (
        <div
          ref={boardRef}
          className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scroll-smooth"
        >
          {items.map((eq) => (
            <div
              key={eq.id}
              className="w-72 shrink-0 flex flex-col rounded-xl p-3 min-h-112 bg-[#e8f6fc]"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">
                      {eq.name}
                    </span>
                    <Badge
                      variant={eq.status === "ativo" ? "default" : "outline"}
                      className={cn(STATUS_CHIP_CLASS, "capitalize")}
                      title={eq.status}
                    >
                      {eq.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                    <Users className="w-3 h-3" />
                    {eq.membros.length} corretor
                    {eq.membros.length === 1 ? "" : "es"}
                    <span className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">
                      {eq.leadsCount ?? 0} lead
                      {(eq.leadsCount ?? 0) === 1 ? "" : "s"}
                    </span>
                    {(eq.leadsPool ?? 0) > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        ({eq.leadsPool} no pool)
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => void openEdit(eq)}
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteId(eq.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <MemberCard member={eq.gerente} roleLabel="Gerente" accent />

                {eq.membros.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-background/50 px-3 py-6 text-center text-xs text-muted-foreground">
                    Sem corretores nesta equipe
                  </div>
                ) : (
                  eq.membros.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      roleLabel="Corretor"
                      onResetPassword={
                        canResetMemberPassword
                          ? () => void handleResetPassword(m)
                          : undefined
                      }
                      resetting={resettingId === m.id}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <FormDialogShell
            open={open}
            onOpenChange={setOpen}
            icon={<Network className="w-5 h-5" />}
            title={formMode === "create" ? "Nova equipe" : "Editar equipe"}
            description="Defina o gerente responsável e os corretores da equipe."
            className="max-w-xl"
          >
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="flex flex-col flex-1 min-h-0"
            >
              <FormDialogBody>
                <FormSection
                  icon={<UserCog className="w-3.5 h-3.5 text-primary" />}
                  title="Identificação"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Nome da equipe
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Ex.: Equipe Recife Norte"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Gerente
                    </Label>
                    <Select
                      value={form.gerenteId || "__none__"}
                      onValueChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          gerenteId: v === "__none__" ? "" : v,
                        }))
                      }
                      disabled={optionsLoading}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Selecionar gerente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>
                          Selecione
                        </SelectItem>
                        {gerenteOptions.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!optionsLoading && gerenteOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum gerente disponível. Cadastre um usuário com
                        perfil gerente.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          status: v as "ativo" | "inativo",
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </FormSection>

                <FormSection
                  icon={<Users className="w-3.5 h-3.5 text-primary" />}
                  title={`Corretores (${selectedCount})`}
                >
                  {optionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando corretores...
                    </div>
                  ) : corretores.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Nenhum corretor disponível. Cadastre corretores em
                      Usuários ou liberte-os de outras equipes.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border p-3">
                      {corretores.map((c) => {
                        const checked = form.membroIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                toggleMembro(c.id, v === true)
                              }
                            />
                            <div className="min-w-0">
                              <div className="table-person-name text-sm truncate">
                                {c.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.email}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </FormSection>
              </FormDialogBody>

              <FormDialogActions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || optionsLoading}>
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {formMode === "create" ? "Criar equipe" : "Salvar"}
                </Button>
              </FormDialogActions>
            </form>
          </FormDialogShell>

          <AlertDialog
            open={Boolean(deleteId)}
            onOpenChange={(o) => !o && setDeleteId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
                <AlertDialogDescription>
                  Os corretores ficarão sem equipe. O gerente poderá ser
                  vinculado a outra equipe depois.
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
        </>
      )}

      <FormDialogShell
        open={!!credentials}
        onOpenChange={(o) => !o && setCredentials(null)}
        icon={<KeyRound className="w-5 h-5" />}
        title="Senha temporária gerada"
        description={
          credentials
            ? `Anote e entregue a ${credentials.name}. A senha só aparece agora.`
            : undefined
        }
      >
        {credentials && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                title="Acesso"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      E-mail
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm break-all">
                        {credentials.email}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.email, "email")
                        }
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      Senha temporária
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-semibold tracking-wide break-all">
                        {credentials.password}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.password, "password")
                        }
                      >
                        {copiedField === "password" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint="Peça ao corretor para trocar a senha no perfil após o login.">
              <Button type="button" onClick={() => setCredentials(null)}>
                Entendi
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>
    </div>
  );
}
