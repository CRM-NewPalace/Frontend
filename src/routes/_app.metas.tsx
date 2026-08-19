import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
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
import { fetchLeadAssignees, type LeadAssignee } from "@/lib/leads-api";
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
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Pencil,
  Plus,
  Target,
  Trash2,
  Trophy,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
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
      const [itens, equipesAtuais, usuariosAtuais, assigneesAtuais] =
        await Promise.all([
          fetchMetas(),
          isAdmin || isGerente ? fetchEquipes() : Promise.resolve([]),
          isAdmin || isGerente
            ? fetchUsers({ status: "ativo", page: 1, limit: 100 })
                .then((res) => res.data)
                .catch(() => [] as ApiUser[])
            : Promise.resolve([]),
          isAdmin || isGerente
            ? fetchLeadAssignees().catch(() => [] as LeadAssignee[])
            : Promise.resolve([]),
        ]);
      setMetas(itens);
      setEquipes(equipesAtuais);
      setUsuarios(usuariosAtuais);
      setAssignees(assigneesAtuais);
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

    for (const assignee of assignees) {
      if (assignee.role && !isCorretorLike(assignee.role)) continue;
      if (map.has(assignee.id)) continue;
      map.set(assignee.id, {
        id: assignee.id,
        name: assignee.name,
        equipeNome:
          equipeNomeByUserId.get(assignee.id) ??
          (assignee.gerente?.name
            ? `Equipe de ${assignee.gerente.name}`
            : "Sem equipe"),
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
  }, [assignees, equipes, isGerente, user?.id, usuarios]);

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
        <div className="space-y-4">
          <MetasResumo metas={metas.filter((m) => m.escopo === "corretor")} />
          <MetasPorOrigem
            metas={metas.filter((m) => m.escopo === "corretor")}
            canEdit={canEditMeta}
            onEdit={openEdit}
            onRemove={remove}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <MetasResumo metas={metas} />
          <p className="text-xs font-medium text-muted-foreground">
            Role para o lado para ver imobiliária, equipes e corretores.
          </p>
          <BoardScroll>
            {(isAdmin || metasImobiliaria.length > 0) && (
              <BoardColumn
                heading={
                  <SectionHeading
                    icon={Building2}
                    title="Imobiliária"
                    count={metasImobiliaria.length}
                  />
                }
              >
                {metasImobiliaria.length > 0 ? (
                  <MetaList
                    metas={metasImobiliaria}
                    canEdit={canEditMeta}
                    onEdit={openEdit}
                    onRemove={remove}
                  />
                ) : (
                  <EmptyColumn text="Nenhuma meta da imobiliária neste período." />
                )}
              </BoardColumn>
            )}

            {(isAdmin || metasGerentes.length > 0) &&
              (metasGerentes.length > 0
                ? Object.entries(
                    metasGerentes.reduce<Record<string, Meta[]>>(
                      (acc, meta) => {
                        const key = meta.gerenteId ?? "sem-gerente";
                        acc[key] = [...(acc[key] ?? []), meta];
                        return acc;
                      },
                      {},
                    ),
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
                      <BoardColumn
                        key={gerenteId}
                        heading={
                          <PersonHeading name={nome} subtitle={equipeNome} />
                        }
                      >
                        <MetaList
                          metas={metasDoGerente}
                          canEdit={canEditMeta}
                          onEdit={openEdit}
                          onRemove={remove}
                        />
                      </BoardColumn>
                    );
                  })
                : (
                    <BoardColumn
                      heading={
                        <SectionHeading
                          icon={UserRound}
                          title="Gerentes / equipes"
                          count={0}
                        />
                      }
                    >
                      <EmptyColumn text="Nenhuma meta de gerente neste período." />
                    </BoardColumn>
                  ))}

            {gruposCorretores.length === 0 ? (
              <BoardColumn
                heading={
                  <SectionHeading icon={Users} title="Corretores" count={0} />
                }
              >
                <EmptyState admin={isAdmin} />
              </BoardColumn>
            ) : (
              gruposCorretores.map(({ corretor, metas: metasDoCorretor }) => (
                <BoardColumn
                  key={corretor.id}
                  heading={
                    <PersonHeading
                      name={corretor.name}
                      subtitle={corretor.equipe?.name ?? "Sem equipe"}
                    />
                  }
                >
                  {metasDoCorretor.length > 0 ? (
                    <MetaList
                      metas={metasDoCorretor}
                      canEdit={canEditMeta}
                      onEdit={openEdit}
                      onRemove={remove}
                    />
                  ) : (
                    <EmptyColumn text="Nenhuma meta neste período." />
                  )}
                </BoardColumn>
              ))
            )}
          </BoardScroll>
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
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Role para o lado para ver as metas atribuídas e as pessoais.
      </p>
      <BoardScroll>
        <BoardColumn
          heading={
            <div>
              <h3 className="text-sm font-bold">Metas atribuídas</h3>
              <p className="text-xs text-muted-foreground">
                Gerência ou administração
              </p>
            </div>
          }
        >
          {metasGerencia.length > 0 ? (
            <MetaList
              metas={metasGerencia}
              canEdit={canEdit}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ) : (
            <EmptyColumn text="Nenhuma meta atribuída neste período." />
          )}
        </BoardColumn>
        <BoardColumn
          heading={
            <div>
              <h3 className="text-sm font-bold">Metas pessoais</h3>
              <p className="text-xs text-muted-foreground">
                Definidas pelo próprio corretor
              </p>
            </div>
          }
        >
          {metasPessoais.length > 0 ? (
            <MetaList
              metas={metasPessoais}
              canEdit={canEdit}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ) : (
            <EmptyColumn text="Nenhuma meta pessoal neste período." />
          )}
        </BoardColumn>
      </BoardScroll>
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
    <div className="flex flex-col gap-3">
      {metas.map((meta) => (
        <MetaCard
          key={meta.id}
          meta={meta}
          editavel={canEdit(meta)}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function MetaCard({
  meta,
  editavel,
  onEdit,
  onRemove,
}: {
  meta: Meta;
  editavel: boolean;
  onEdit: (meta: Meta) => void;
  onRemove: (meta: Meta) => void;
}) {
  const visual = getMetaVisual(meta.tipo);
  const Icon = visual.icon;
  const concluida = meta.percentual >= 100;
  const tone = progressTone(meta.percentual);
  const barra = Math.min(100, Math.max(0, meta.percentual));
  const restante = Math.max(0, meta.valor - meta.atual);
  const superou = meta.atual > meta.valor;
  const origemLabel =
    meta.origem === "admin"
      ? "Administração"
      : meta.origem === "gerente"
        ? "Gerência"
        : "Pessoal";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        tone.card,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1.5", tone.bar)} />
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn("rounded-xl p-2.5", visual.iconBg)}>
              <Icon className={cn("h-5 w-5", visual.iconColor)} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">
                {META_TIPO_LABEL[meta.tipo]}
              </CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/70">
                  <CalendarDays className="h-3 w-3" />
                  {META_PERIODO_LABEL[meta.periodo]}
                </span>
                {meta.escopo !== "corretor" ? (
                  <span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/70">
                    {META_ESCOPO_LABEL[meta.escopo]}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "text-3xl font-black tabular-nums leading-none tracking-tight",
                tone.pct,
              )}
            >
              {meta.percentual}%
            </p>
            <Badge
              className={cn("mt-1.5 border-transparent text-[10px]", tone.badge)}
              variant="secondary"
            >
              {origemLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-background/70 px-3 py-2.5 ring-1 ring-border/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Realizado
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums leading-snug">
              {formatValor(meta.atual, meta.tipo)}
            </p>
          </div>
          <div className="rounded-xl bg-background/70 px-3 py-2.5 ring-1 ring-border/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Meta
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums leading-snug">
              {formatValor(meta.valor, meta.tipo)}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                concluida
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {concluida ? <Trophy className="h-3.5 w-3.5" /> : null}
              {concluida
                ? superou
                  ? `Superou em ${formatValor(meta.atual - meta.valor, meta.tipo)}`
                  : "Meta atingida"
                : `Faltam ${formatValor(restante, meta.tipo)}`}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", tone.bar)}
              style={{ width: `${barra}%` }}
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
}

function BoardScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={ref}
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
    >
      {children}
    </div>
  );
}

function BoardColumn({
  heading,
  children,
}: {
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex w-[min(22rem,calc(100vw-4.5rem))] shrink-0 snap-start flex-col gap-3">
      {heading}
      {children}
    </section>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function MetasResumo({ metas }: { metas: Meta[] }) {
  if (metas.length === 0) return null;
  const concluidas = metas.filter((meta) => meta.percentual >= 100).length;
  const media = Math.round(
    metas.reduce((soma, meta) => soma + meta.percentual, 0) / metas.length,
  );
  return (
    <div className="grid grid-cols-3 gap-3">
      <ResumoChip label="Metas ativas" value={String(metas.length)} />
      <ResumoChip
        label="Atingidas"
        value={String(concluidas)}
        hint={`${metas.length - concluidas} em andamento`}
        tone="emerald"
      />
      <ResumoChip
        label="Progresso médio"
        value={`${media}%`}
        tone={media >= 100 ? "emerald" : media < 40 ? "amber" : "blue"}
      />
    </div>
  );
}

function ResumoChip({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "blue" | "emerald" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        tone === "emerald" &&
          "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10",
        tone === "amber" &&
          "border-amber-200/80 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10",
        tone === "blue" && "border-border/70 bg-card",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-black tabular-nums tracking-tight",
          tone === "emerald" && "text-emerald-700 dark:text-emerald-400",
          tone === "amber" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="font-bold tracking-tight">{title}</h2>
      {count != null ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function PersonHeading({
  name,
  subtitle,
}: {
  name: string;
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
        {iniciais(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight">{name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function progressTone(percentual: number) {
  if (percentual >= 100) {
    return {
      bar: "bg-emerald-500",
      pct: "text-emerald-700 dark:text-emerald-400",
      card: "border-emerald-200/80 bg-linear-to-br from-emerald-50/90 via-card to-card dark:from-emerald-500/10 dark:border-emerald-500/30",
      badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    };
  }
  if (percentual >= 70) {
    return {
      bar: "bg-[var(--kpi-seq-2,#079ED4)]",
      pct: "text-[var(--kpi-seq-2,#079ED4)]",
      card: "border-sky-200/70 bg-linear-to-br from-sky-50/80 via-card to-card dark:from-sky-500/10 dark:border-sky-500/25",
      badge: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
    };
  }
  if (percentual >= 40) {
    return {
      bar: "bg-[var(--kpi-seq-3,#0689BD)]",
      pct: "text-foreground",
      card: "border-border/70 bg-linear-to-br from-card via-card to-muted/30",
      badge: "bg-muted text-muted-foreground",
    };
  }
  return {
    bar: "bg-amber-500",
    pct: "text-amber-700 dark:text-amber-400",
    card: "border-amber-200/80 bg-linear-to-br from-amber-50/80 via-card to-card dark:from-amber-500/10 dark:border-amber-500/25",
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  };
}

function getMetaVisual(tipo: MetaTipo) {
  if (tipo === "documentacoes") {
    return {
      icon: FileText,
      iconBg:
        "bg-[color-mix(in_srgb,var(--kpi-seq-1,#5BC4E8)_15%,transparent)]",
      iconColor: "text-[var(--kpi-seq-1,#5BC4E8)]",
    };
  }
  if (tipo === "vgv") {
    return {
      icon: Wallet,
      iconBg:
        "bg-[color-mix(in_srgb,var(--kpi-seq-2,#079ED4)_15%,transparent)]",
      iconColor: "text-[var(--kpi-seq-2,#079ED4)]",
    };
  }
  return {
    icon: Target,
    iconBg:
      "bg-[color-mix(in_srgb,var(--kpi-seq-3,#0689BD)_15%,transparent)]",
    iconColor: "text-[var(--kpi-seq-3,#0689BD)]",
  };
}

function EmptyState({ admin = false }: { admin?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed py-12 text-center">
      <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-semibold">Nenhuma meta ativa</p>
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
