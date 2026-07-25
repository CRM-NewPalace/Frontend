import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import {
  Plus, MoreHorizontal, KeyRound, Ban, Pencil, Trash2, Eye, UserPlus,
  Search, CheckCircle2, Sparkles, Shield,
} from "lucide-react";
import { getSession, type Role, type UserStatus } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useLeads } from "@/lib/leads-store";
import {
  createUser, deleteUser, fetchUsers, resetUserPassword,
  updateUser, updateUserStatus, type ApiUser,
} from "@/lib/users-api";
import {
  formatPhone, isValidPhone, PHONE_INVALID_MESSAGE, PHONE_PLACEHOLDER,
} from "@/lib/phone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Imob CRM" }] }),
  component: Usuarios,
});

/** Cache da lista para abrir a tela sem esperar a API (sincroniza em background). */
const USERS_CACHE_KEY = "crm_users_cache_v1";
let usersMemoryCache: ApiUser[] | null = null;

function getUsersCache(): ApiUser[] | null {
  if (usersMemoryCache) return usersMemoryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiUser[];
    if (!Array.isArray(parsed)) return null;
    usersMemoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function setUsersCache(users: ApiUser[]) {
  usersMemoryCache = users;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  } catch {
    // quota / private mode — ignore
  }
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

const PASSWORD_HINT = "Mín. 8 caracteres, com maiúscula, minúscula e número.";

type FormMode = "create" | "edit";
type FormState = {
  name: string;
  email: string;
  phone: string;
  cargo: string;
  role: Role;
  status: UserStatus;
  password: string;
};

const emptyForm = (): FormState => ({
  name: "",
  email: "",
  phone: "",
  cargo: "",
  role: "corretor",
  status: "ativo",
  password: "",
});

function userToForm(u: ApiUser): FormState {
  return {
    name: u.name,
    email: u.email,
    phone: u.phone ? formatPhone(u.phone) : "",
    cargo: u.cargo ?? "",
    role: u.role,
    status: u.status,
    password: "",
  };
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function roleBadgeClass(role: Role) {
  if (role === "admin") return "bg-primary/15 text-primary border-primary/30";
  if (role === "gerente") return "bg-info/15 text-info border-info/30";
  return "bg-muted text-muted-foreground";
}

function formatLastAccess(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR");
}

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function Usuarios() {
  const session = getSession();
  const { refresh: refreshLeads } = useLeads();

  const cachedUsers = getUsersCache();
  const [users, setUsersState] = useState<ApiUser[]>(cachedUsers ?? []);
  // Só bloqueia com "Carregando..." na primeira visita sem cache.
  const [loading, setLoading] = useState(!cachedUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  /** Atualiza estado + cache juntos. */
  const setUsers = useCallback(
    (updater: (prev: ApiUser[]) => ApiUser[]) => {
      setUsersState((prev) => {
        const next = updater(prev);
        setUsersCache(next);
        return next;
      });
    },
    [],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<ApiUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const page = await fetchUsers({ page: 1, limit: 100 });
      setUsers(() => page.data);
    } catch (err) {
      if (!opts?.silent) {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os usuários.");
      }
    } finally {
      setLoading(false);
    }
  }, [setUsers]);

  useEffect(() => {
    void load({ silent: Boolean(cachedUsers) });
    // Só no mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hay = `${u.name} ${u.email} ${u.phone ?? ""} ${u.cargo ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(u: ApiUser) {
    setFormMode("edit");
    setEditingId(u.id);
    setForm(userToForm(u));
    setFormOpen(true);
    setDetail(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function syncTeam() {
    // Assignees dos leads em background (sem travar a UI).
    void refreshLeads({ silent: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const cargo = form.cargo.trim();

    if (!name || !email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (phone && !isValidPhone(phone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (formMode === "create" && !isStrongPassword(form.password)) {
      toast.error(PASSWORD_HINT);
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        const created = await createUser({
          name,
          email,
          password: form.password,
          phone: phone || undefined,
          cargo: cargo || undefined,
          role: form.role,
          status: form.status,
        });
        setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
        toast.success(`Usuário ${name} criado.`);
      } else if (editingId) {
        const updated = await updateUser(editingId, {
          name,
          email,
          phone: phone || null,
          cargo: cargo || null,
          role: form.role,
          status: form.status,
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        toast.success("Usuário atualizado.");
      }
      setFormOpen(false);
      void syncTeam();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    // Otimista: some da tabela na hora; volta se a API falhar.
    setUsers((prev) => prev.filter((u) => u.id !== target.id));
    setDeleteTarget(null);
    setDetail(null);
    toast.success(`Usuário ${target.name} excluído.`);
    try {
      await deleteUser(target.id);
      void syncTeam();
    } catch (err) {
      setUsers((prev) => [target, ...prev.filter((u) => u.id !== target.id)]);
      toast.error(err instanceof ApiError ? err.message : "Não foi possível excluir.");
    }
  }

  async function toggleStatus(u: ApiUser) {
    const next: UserStatus = u.status === "ativo" ? "inativo" : "ativo";
    // Otimista: badge muda na hora; volta se a API falhar.
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)),
    );
    if (detail?.id === u.id) setDetail((d) => (d ? { ...d, status: next } : d));
    toast.success(next === "ativo" ? `${u.name} reativado.` : `${u.name} inativado.`);
    try {
      const updated = await updateUserStatus(u.id, next);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      void syncTeam();
    } catch (err) {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)),
      );
      if (detail?.id === u.id) setDetail((d) => (d ? { ...d, status: u.status } : d));
      toast.error(err instanceof ApiError ? err.message : "Não foi possível alterar o status.");
    }
  }

  async function handleResetPassword(u: ApiUser) {
    try {
      const result = await resetUserPassword(u.id);
      if (result.temporaryPassword) {
        toast.success(`Senha temporária gerada para ${u.name}`, {
          description: result.temporaryPassword,
          duration: 20_000,
        });
      } else {
        toast.success(`Senha de ${u.name} redefinida.`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível resetar a senha.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        description={loading ? "Carregando usuários..." : `${filtered.length} de ${users.length} usuários`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Novo usuário
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="gerente">Gerente</SelectItem>
              <SelectItem value="corretor">Corretor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{u.cargo || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleBadgeClass(u.role)}>{ROLE_LABEL[u.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "ativo" ? "default" : "secondary"}>{STATUS_LABEL[u.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatLastAccess(u.lastLoginAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(u)}>
                          <Eye className="w-3.5 h-3.5 mr-2" />Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleResetPassword(u)}>
                          <KeyRound className="w-3.5 h-3.5 mr-2" />Resetar senha
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={session?.id === u.id && u.status === "ativo"}
                          onClick={() => void toggleStatus(u)}
                        >
                          {u.status === "ativo" ? (
                            <><Ban className="w-3.5 h-3.5 mr-2" />Inativar</>
                          ) : (
                            <><CheckCircle2 className="w-3.5 h-3.5 mr-2" />Reativar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={session?.id === u.id}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />Excluir
                        </DropdownMenuItem>
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
        icon={formMode === "edit" ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar usuário" : "Novo usuário"}
        description={formMode === "edit" ? "Atualize os dados de acesso da equipe." : "Cadastre um novo acesso ao CRM."}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Dados">
              <div className="space-y-1.5">
                <Label htmlFor="usr-nome" className="text-xs text-muted-foreground">Nome completo</Label>
                <Input id="usr-nome" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ex.: Marina Alves" className="h-10 bg-background" autoFocus required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="usr-email" className="text-xs text-muted-foreground">E-mail</Label>
                  <Input id="usr-email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="nome@imob.com" className="h-10 bg-background" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="usr-tel" className="text-xs text-muted-foreground">Telefone</Label>
                  <Input id="usr-tel" type="tel" value={form.phone} onChange={(e) => setField("phone", formatPhone(e.target.value))} placeholder={PHONE_PLACEHOLDER} className="h-10 bg-background" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usr-cargo" className="text-xs text-muted-foreground">Cargo</Label>
                <Input id="usr-cargo" value={form.cargo} onChange={(e) => setField("cargo", e.target.value)} placeholder="Ex.: Corretor sênior" className="h-10 bg-background" />
              </div>
            </FormSection>
            <FormSection icon={<Shield className="w-3.5 h-3.5 text-primary" />} title="Acesso">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Perfil</Label>
                  <Select value={form.role} onValueChange={(v) => setField("role", v as Role)}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="corretor">Corretor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setField("status", v as UserStatus)} disabled={formMode === "edit" && editingId === session?.id}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formMode === "create" && (
                <div className="space-y-1.5">
                  <Label htmlFor="usr-senha" className="text-xs text-muted-foreground">Senha inicial</Label>
                  <Input id="usr-senha" type="text" autoComplete="new-password" value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder="Ex.: Senha@123" className="h-10 bg-background" required />
                  <p className={cn("text-[11px]", form.password && !isStrongPassword(form.password) ? "text-destructive" : "text-muted-foreground")}>{PASSWORD_HINT}</p>
                </div>
              )}
            </FormSection>
          </FormDialogBody>
          <FormDialogActions hint="As alterações são salvas no banco.">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : formMode === "edit" ? "Salvar alterações" : "Criar usuário"}</Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.name ?? "Detalhes do usuário"}
        description={detail ? (
          <span className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={roleBadgeClass(detail.role)}>{ROLE_LABEL[detail.role]}</Badge>
            <Badge variant={detail.status === "ativo" ? "default" : "secondary"}>{STATUS_LABEL[detail.status]}</Badge>
          </span>
        ) : undefined}
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Contato">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="E-mail" value={detail.email} />
                  <DetailField label="Telefone" value={detail.phone || "—"} />
                  <DetailField label="Cargo" value={detail.cargo || "—"} />
                  <DetailField label="Último acesso" value={formatLastAccess(detail.lastLoginAt)} />
                </div>
              </FormSection>
              <FormSection icon={<Shield className="w-3.5 h-3.5 text-primary" />} title="Acesso">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Perfil" value={ROLE_LABEL[detail.role]} />
                  <DetailField label="Status" value={STATUS_LABEL[detail.status]} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button type="button" variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
              <Button type="button" onClick={() => openEdit(detail)}><Pencil className="w-4 h-4 mr-1" />Editar</Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Tem certeza que deseja excluir ${deleteTarget.name}? Esta ação não pode ser desfeita.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
