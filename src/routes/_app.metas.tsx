import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSession } from "@/lib/auth";
import { isCorretorLike } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { fetchUsers, type ApiUser } from "@/lib/users-api";
import {
  META_ESCOPO_LABEL,
  META_PERIODOS,
  META_PERIODO_LABEL,
  META_TIPOS,
  META_TIPO_LABEL,
  createMeta,
  deleteMeta,
  fetchMetas,
  updateMeta,
  type Meta,
  type MetaEscopo,
  type MetaPeriodo,
  type MetaTipo,
} from "@/lib/metas-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Pencil,
  Plus,
  Target,
  Trash2,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas — Zone Connection" }] }),
  component: Page,
});

function Page() {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const isGerente = user?.role === "gerente";
  const [metas, setMetas] = useState<Meta[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [usuarios, setUsuarios] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [form, setForm] = useState({
    escopo: "corretor" as MetaEscopo,
    corretorId: "",
    gerenteId: "",
    tipo: "vendas" as MetaTipo,
    periodo: "mensal" as MetaPeriodo,
    valor: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itens, equipesAtuais, usuariosAtuais] = await Promise.all([
        fetchMetas(),
        isAdmin || isGerente ? fetchEquipes() : Promise.resolve([]),
        isAdmin || isGerente
          ? fetchUsers({ status: "ativo", page: 1, limit: 200 })
              .then((res) => res.data)
              .catch(() => [] as ApiUser[])
          : Promise.resolve([]),
      ]);
      setMetas(itens);
      setEquipes(equipesAtuais);
      setUsuarios(usuariosAtuais);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível carregar as metas.",
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isGerente]);

  useEffect(() => {
    void load();
  }, [load]);

  const corretores = useMemo(() => {
    const equipeNomeByUserId = new Map<string, string>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) {
        equipeNomeByUserId.set(membro.id, equipe.name);
      }
    }

    const map = new Map<
      string,
      { id: string; name: string; equipeNome: string }
    >();

    for (const usuario of usuarios) {
      if (!isCorretorLike(usuario.role)) continue;
      map.set(usuario.id, {
        id: usuario.id,
        name: usuario.name,
        equipeNome: equipeNomeByUserId.get(usuario.id) ?? "Sem equipe",
      });
    }

    for (const equipe of equipes) {
      if (isGerente && equipe.gerenteId !== user?.id) continue;
      for (const membro of equipe.membros) {
        if (!isCorretorLike(membro.role) || membro.status === "inativo") {
          continue;
        }
        if (map.has(membro.id)) continue;
        map.set(membro.id, {
          id: membro.id,
          name: membro.name,
          equipeNome: equipe.name,
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [equipes, isGerente, user?.id, usuarios]);

  const gerentes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; equipeNome: string }>();
    for (const equipe of equipes) {
      map.set(equipe.gerente.id, {
        id: equipe.gerente.id,
        name: equipe.gerente.name,
        equipeNome: equipe.name,
      });
    }
    for (const usuario of usuarios) {
      if (usuario.role !== "gerente") continue;
      if (map.has(usuario.id)) continue;
      map.set(usuario.id, {
        id: usuario.id,
        name: usuario.name,
        equipeNome: "Sem equipe",
      });
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [equipes, usuarios]);

  const metasImobiliaria = useMemo(
    () => metas.filter((meta) => meta.escopo === "imobiliaria"),
    [metas],
  );

  const metasGerentes = useMemo(
    () => metas.filter((meta) => meta.escopo === "gerente"),
    [metas],
  );

  const gruposCorretores = useMemo(() => {
    if (!isAdmin && !isGerente) return [];
    const metasPorCorretor = new Map<string, Meta[]>();
    metas
      .filter((meta) => meta.escopo === "corretor" && meta.corretorId)
      .forEach((meta) => {
        const itens = metasPorCorretor.get(meta.corretorId!) ?? [];
        itens.push(meta);
        metasPorCorretor.set(meta.corretorId!, itens);
      });
    return corretores.map((corretor) => {
      const metasDoCorretor = metasPorCorretor.get(corretor.id) ?? [];
      return {
        corretor: metasDoCorretor[0]?.corretor ?? {
          id: corretor.id,
          name: corretor.name,
          equipeId: null,
          equipe: { id: "equipe", name: corretor.equipeNome },
        },
        metas: metasDoCorretor,
      };
    });
  }, [corretores, isAdmin, isGerente, metas]);

  function openCreate() {
    setEditing(null);
    setForm({
      escopo: isAdmin ? "imobiliaria" : "corretor",
      corretorId: "",
      gerenteId: "",
      tipo: "vendas",
      periodo: "mensal",
      valor: "",
    });
    setOpen(true);
  }

  function openEdit(meta: Meta) {
    setEditing(meta);
    setForm({
      escopo: meta.escopo,
      corretorId: meta.corretorId ?? "",
      gerenteId: meta.gerenteId ?? "",
      tipo: meta.tipo,
      periodo: meta.periodo,
      valor:
        meta.tipo === "vgv"
          ? formatMoneyInput(meta.valor)
          : String(meta.valor),
    });
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const valor =
      form.tipo === "vgv"
        ? parseOptionalMoneyInput(form.valor)
        : Number(form.valor.replace(/\D/g, ""));
    if (valor == null || !Number.isFinite(valor) || valor < 1) {
      toast.error(
        form.tipo === "vgv"
          ? "Informe um valor de meta maior que zero."
          : "Informe uma meta inteira maior que zero.",
      );
      return;
    }
    if (form.tipo !== "vgv" && !Number.isInteger(valor)) {
      toast.error("Informe uma meta inteira maior que zero.");
      return;
    }
    if (!editing) {
      if (
        (isGerente || (isAdmin && form.escopo === "corretor")) &&
        !form.corretorId
      ) {
        toast.error("Selecione o corretor que receberá a meta.");
        return;
      }
      if (isAdmin && form.escopo === "gerente" && !form.gerenteId) {
        toast.error("Selecione o gerente que receberá a meta.");
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        await updateMeta(editing.id, valor);
        toast.success("Meta atualizada.");
      } else {
        await createMeta({
          ...(isAdmin ? { escopo: form.escopo } : {}),
          ...(form.escopo === "corretor" && (isAdmin || isGerente)
            ? { corretorId: form.corretorId }
            : {}),
          ...(isAdmin && form.escopo === "gerente"
            ? { gerenteId: form.gerenteId }
            : {}),
          tipo: form.tipo,
          periodo: form.periodo,
          valor,
        });
        toast.success("Meta salva.");
      }
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar a meta.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(meta: Meta) {
    if (
      !window.confirm(
        `Excluir a meta de ${META_TIPO_LABEL[meta.tipo].toLowerCase()}?`,
      )
    )
      return;
    try {
      await deleteMeta(meta.id);
      toast.success("Meta excluída.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir a meta.",
      );
    }
  }

  const canCreate =
    isCorretorLike(user?.role) || isGerente || isAdmin;

  const canEditMeta = (meta: Meta) => {
    if (isAdmin) return meta.origem === "admin";
    if (isGerente)
      return (
        meta.origem === "gerente" &&
        meta.escopo === "corretor" &&
        meta.criadorId === user?.id
      );
    return meta.origem === "pessoal" && meta.escopo === "corretor";
  };

  return (
    <div>
      <PageHeader
        title="Metas"
        description={
          isAdmin
            ? "Defina metas da imobiliária, por gerente ou por corretor."
            : isGerente
              ? "Defina e acompanhe as metas da sua equipe."
              : "Acompanhe suas metas pessoais e as definidas pela gerência."
        }
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              {isAdmin
                ? "Nova meta"
                : isGerente
                  ? "Definir meta"
                  : "Minha meta"}
            </Button>
          ) : undefined
        }
      />
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Carregando metas...
        </div>
      ) : !isAdmin && !isGerente ? (
        <MetasPorOrigem
          metas={metas.filter((m) => m.escopo === "corretor")}
          canEdit={canEditMeta}
          onEdit={openEdit}
          onRemove={remove}
        />
      ) : (
        <div className="space-y-8">
          {(isAdmin || metasImobiliaria.length > 0) && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-primary">Imobiliária</h2>
              </div>
              {metasImobiliaria.length > 0 ? (
                <MetaList
                  metas={metasImobiliaria}
                  canEdit={canEditMeta}
                  onEdit={openEdit}
                  onRemove={remove}
                />
              ) : (
                <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  Nenhuma meta da imobiliária neste período.
                </p>
              )}
            </section>
          )}

          {(isAdmin || metasGerentes.length > 0) && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-primary">Gerentes / equipes</h2>
              </div>
              {metasGerentes.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    metasGerentes.reduce<Record<string, Meta[]>>((acc, meta) => {
                      const key = meta.gerenteId ?? "sem-gerente";
                      acc[key] = [...(acc[key] ?? []), meta];
                      return acc;
                    }, {}),
                  ).map(([gerenteId, metasDoGerente]) => {
                    const fromMeta = metasDoGerente[0]?.gerente;
                    const fromEquipe = gerentes.find((g) => g.id === gerenteId);
                    const nome =
                      fromMeta?.name ?? fromEquipe?.name ?? "Gerente";
                    const equipeNome =
                      fromMeta?.equipeGerenciada?.name ??
                      fromEquipe?.equipeNome ??
                      null;
                    return (
                      <div key={gerenteId} className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {nome}
                          {equipeNome ? ` · ${equipeNome}` : ""}
                        </p>
                        <MetaList
                          metas={metasDoGerente}
                          canEdit={canEditMeta}
                          onEdit={openEdit}
                          onRemove={remove}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  Nenhuma meta de gerente neste período.
                </p>
              )}
            </section>
          )}

          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-primary">Corretores</h2>
            </div>
            {gruposCorretores.length === 0 ? (
              <EmptyState admin={isAdmin} />
            ) : (
              gruposCorretores.map(({ corretor, metas: metasDoCorretor }) => (
                <section key={corretor.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{corretor.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {corretor.equipe?.name ?? "Sem equipe"}
                    </span>
                  </div>
                  <MetasPorOrigem
                    metas={metasDoCorretor}
                    canEdit={canEditMeta}
                    onEdit={openEdit}
                    onRemove={remove}
                  />
                </section>
              ))
            )}
          </section>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Editar meta"
                : isAdmin
                  ? "Nova meta administrativa"
                  : isGerente
                    ? "Definir meta para a equipe"
                    : "Criar minha meta"}
            </DialogTitle>
            <DialogDescription>
              Metas diárias, semanais e mensais são acompanhadas separadamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {isAdmin && !editing && (
              <div className="space-y-2">
                <Label>Alvo da meta</Label>
                <Select
                  value={form.escopo}
                  onValueChange={(escopo: MetaEscopo) =>
                    setForm((atual) => ({
                      ...atual,
                      escopo,
                      corretorId: "",
                      gerenteId: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imobiliaria">
                      {META_ESCOPO_LABEL.imobiliaria}
                    </SelectItem>
                    <SelectItem value="gerente">
                      {META_ESCOPO_LABEL.gerente}
                    </SelectItem>
                    <SelectItem value="corretor">
                      {META_ESCOPO_LABEL.corretor}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {((isGerente && !editing) ||
              (isAdmin && !editing && form.escopo === "corretor")) && (
              <div className="space-y-2">
                <Label>Corretor</Label>
                <Select
                  value={form.corretorId || undefined}
                  onValueChange={(corretorId) =>
                    setForm((atual) => ({ ...atual, corretorId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um corretor" />
                  </SelectTrigger>
                  <SelectContent>
                    {corretores.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        Nenhum corretor cadastrado.
                      </div>
                    ) : (
                      corretores.map((corretor) => (
                        <SelectItem key={corretor.id} value={corretor.id}>
                          {corretor.name} — {corretor.equipeNome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAdmin && !editing && form.escopo === "gerente" && (
              <div className="space-y-2">
                <Label>Gerente</Label>
                <Select
                  value={form.gerenteId || undefined}
                  onValueChange={(gerenteId) =>
                    setForm((atual) => ({ ...atual, gerenteId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gerente" />
                  </SelectTrigger>
                  <SelectContent>
                    {gerentes.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        Nenhum gerente cadastrado.
                      </div>
                    ) : (
                      gerentes.map((gerente) => (
                        <SelectItem key={gerente.id} value={gerente.id}>
                          {gerente.name} — {gerente.equipeNome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Indicador</Label>
                <Select
                  value={form.tipo}
                  disabled={Boolean(editing)}
                  onValueChange={(tipo: MetaTipo) =>
                    setForm((atual) => ({ ...atual, tipo }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {META_TIPOS.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {META_TIPO_LABEL[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={form.periodo}
                  disabled={Boolean(editing)}
                  onValueChange={(periodo: MetaPeriodo) =>
                    setForm((atual) => ({ ...atual, periodo }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {META_PERIODOS.map((periodo) => (
                      <SelectItem key={periodo} value={periodo}>
                        {META_PERIODO_LABEL[periodo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {form.tipo === "vgv" ? "Valor em R$" : "Quantidade"}
              </Label>
              <Input
                inputMode="numeric"
                value={form.valor}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    valor:
                      form.tipo === "vgv"
                        ? maskMoneyInput(event.target.value)
                        : event.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder={form.tipo === "vgv" ? "0,00" : "Ex.: 5"}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar meta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetasPorOrigem({
  metas,
  canEdit,
  onEdit,
  onRemove,
}: {
  metas: Meta[];
  canEdit: (meta: Meta) => boolean;
  onEdit: (meta: Meta) => void;
  onRemove: (meta: Meta) => void;
}) {
  const metasGerencia = metas.filter(
    (meta) => meta.origem === "gerente" || meta.origem === "admin",
  );
  const metasPessoais = metas.filter((meta) => meta.origem === "pessoal");

  if (metas.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="font-medium text-primary">Metas atribuídas</h3>
          <p className="text-sm text-muted-foreground">
            Metas definidas pela gerência ou administração.
          </p>
        </div>
        {metasGerencia.length > 0 ? (
          <MetaList
            metas={metasGerencia}
            canEdit={canEdit}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ) : (
          <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Nenhuma meta atribuída para este período.
          </p>
        )}
      </section>
      <section className="space-y-3">
        <div>
          <h3 className="font-medium text-primary">Metas pessoais</h3>
          <p className="text-sm text-muted-foreground">
            Metas definidas pelo próprio corretor.
          </p>
        </div>
        {metasPessoais.length > 0 ? (
          <MetaList
            metas={metasPessoais}
            canEdit={canEdit}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ) : (
          <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Nenhuma meta pessoal para este período.
          </p>
        )}
      </section>
    </div>
  );
}

function MetaList({
  metas,
  canEdit,
  onEdit,
  onRemove,
}: {
  metas: Meta[];
  canEdit: (meta: Meta) => boolean;
  onEdit: (meta: Meta) => void;
  onRemove: (meta: Meta) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metas.map((meta) => {
        const editavel = canEdit(meta);
        const visual = getMetaVisual(meta.tipo);
        const Icon = visual.icon;
        const concluida = meta.percentual >= 100;
        const origemLabel =
          meta.origem === "admin"
            ? "Administração"
            : meta.origem === "gerente"
              ? "Gerência"
              : "Pessoal";
        return (
          <Card
            key={meta.id}
            className="group relative overflow-hidden border-border/70 bg-linear-to-br from-card via-card to-muted/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 ${visual.progress}`}
            />
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${visual.iconBg}`}>
                    <Icon className={`h-5 w-5 ${visual.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {META_TIPO_LABEL[meta.tipo]}
                    </CardTitle>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {META_PERIODO_LABEL[meta.periodo]}
                      {meta.escopo !== "corretor" ? (
                        <> · {META_ESCOPO_LABEL[meta.escopo]}</>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Badge
                  className={
                    meta.origem === "admin"
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : meta.origem === "gerente"
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-primary/20 bg-primary/5 text-primary"
                  }
                  variant="outline"
                >
                  {origemLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Realizado
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {formatValor(meta.atual, meta.tipo)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/70 px-3 py-2 text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Meta
                  </p>
                  <p className="text-sm font-semibold">
                    {formatValor(meta.valor, meta.tipo)}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={
                      concluida
                        ? "flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }
                  >
                    {concluida && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {concluida ? "Meta concluída" : "Em andamento"}
                  </span>
                  <span className="font-semibold">{meta.percentual}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${concluida ? "bg-emerald-500" : visual.progress}`}
                    style={{ width: `${meta.percentual}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <p className="truncate text-xs text-muted-foreground">
                  {meta.origem === "pessoal"
                    ? "Definida por você"
                    : `Definida por ${meta.criador.name}`}
                </p>
                {editavel && (
                  <div className="flex shrink-0 gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onEdit(meta)}
                      aria-label="Editar meta"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onRemove(meta)}
                      aria-label="Excluir meta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getMetaVisual(tipo: MetaTipo) {
  if (tipo === "documentacoes") {
    return {
      icon: FileText,
      iconBg:
        "bg-[color-mix(in_srgb,var(--kpi-seq-1,#5BC4E8)_15%,transparent)]",
      iconColor: "text-[var(--kpi-seq-1,#5BC4E8)]",
      progress: "bg-[var(--kpi-seq-1,#5BC4E8)]",
    };
  }
  if (tipo === "vgv") {
    return {
      icon: Wallet,
      iconBg:
        "bg-[color-mix(in_srgb,var(--kpi-seq-2,#079ED4)_15%,transparent)]",
      iconColor: "text-[var(--kpi-seq-2,#079ED4)]",
      progress: "bg-[var(--kpi-seq-2,#079ED4)]",
    };
  }
  return {
    icon: Target,
    iconBg:
      "bg-[color-mix(in_srgb,var(--kpi-seq-3,#0689BD)_15%,transparent)]",
    iconColor: "text-[var(--kpi-seq-3,#0689BD)]",
    progress: "bg-[var(--kpi-seq-3,#0689BD)]",
  };
}

function EmptyState({ admin = false }: { admin?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed py-12 text-center">
      <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">Nenhuma meta ativa</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {admin
          ? "Crie metas da imobiliária, por gerente ou por corretor."
          : "Defina uma meta para começar o acompanhamento."}
      </p>
    </div>
  );
}

function formatValor(valor: number, tipo: MetaTipo) {
  return tipo === "vgv"
    ? valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : valor.toLocaleString("pt-BR");
}
