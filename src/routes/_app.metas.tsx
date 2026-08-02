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
import { ApiError } from "@/lib/api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import {
  META_PERIODOS,
  META_PERIODO_LABEL,
  META_TIPOS,
  META_TIPO_LABEL,
  createMeta,
  deleteMeta,
  fetchMetas,
  updateMeta,
  type Meta,
  type MetaPeriodo,
  type MetaTipo,
} from "@/lib/metas-api";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Pencil,
  Plus,
  Target,
  Trash2,
  Users,
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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [form, setForm] = useState({
    corretorId: "",
    tipo: "vendas" as MetaTipo,
    periodo: "mensal" as MetaPeriodo,
    valor: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itens, equipesAtuais] = await Promise.all([
        fetchMetas(),
        isAdmin || isGerente ? fetchEquipes() : Promise.resolve([]),
      ]);
      setMetas(itens);
      setEquipes(equipesAtuais);
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

  const corretores = useMemo(
    () =>
      equipes.flatMap((equipe) =>
        equipe.membros
          .filter((membro) => membro.role === "corretor")
          .map((membro) => ({ ...membro, equipeNome: equipe.name })),
      ),
    [equipes],
  );

  const grupos = useMemo(() => {
    if (!isAdmin && !isGerente) return [];
    const metasPorCorretor = new Map<string, Meta[]>();
    metas.forEach((meta) => {
      const itens = metasPorCorretor.get(meta.corretorId) ?? [];
      itens.push(meta);
      metasPorCorretor.set(meta.corretorId, itens);
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
      corretorId: "",
      tipo: "vendas",
      periodo: "mensal",
      valor: "",
    });
    setOpen(true);
  }

  function openEdit(meta: Meta) {
    setEditing(meta);
    setForm({
      corretorId: meta.corretorId,
      tipo: meta.tipo,
      periodo: meta.periodo,
      valor: String(meta.valor),
    });
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const valor = Number(form.valor);
    if (!Number.isInteger(valor) || valor < 1) {
      toast.error("Informe uma meta inteira maior que zero.");
      return;
    }
    if (isGerente && !editing && !form.corretorId) {
      toast.error("Selecione o corretor que receberá a meta.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateMeta(editing.id, valor);
        toast.success("Meta atualizada.");
      } else {
        await createMeta({
          ...(isGerente ? { corretorId: form.corretorId } : {}),
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

  const canCreate = user?.role === "corretor" || isGerente;

  return (
    <div>
      <PageHeader
        title="Metas"
        description={
          isAdmin
            ? "Acompanhe as metas ativas de todas as equipes."
            : isGerente
              ? "Defina e acompanhe as metas da sua equipe."
              : "Acompanhe suas metas pessoais e as definidas pela gerência."
        }
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              {isGerente ? "Definir meta" : "Minha meta"}
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
          metas={metas}
          canEdit={(meta) => meta.origem === "pessoal"}
          onEdit={openEdit}
          onRemove={remove}
        />
      ) : grupos.length === 0 ? (
        <EmptyState admin={isAdmin} />
      ) : (
        <div className="space-y-5">
          {grupos.map(({ corretor, metas: metasDoCorretor }) => (
            <section key={corretor.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{corretor.name}</h2>
                <span className="text-sm text-muted-foreground">
                  {corretor.equipe?.name ?? "Sem equipe"}
                </span>
              </div>
              <MetasPorOrigem
                metas={metasDoCorretor}
                canEdit={(meta) =>
                  isGerente &&
                  meta.origem === "gerente" &&
                  meta.criadorId === user?.id
                }
                onEdit={openEdit}
                onRemove={remove}
              />
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Editar meta"
                : isGerente
                  ? "Definir meta para a equipe"
                  : "Criar minha meta"}
            </DialogTitle>
            <DialogDescription>
              Metas diárias, semanais e mensais são acompanhadas separadamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {isGerente && !editing && (
              <div className="space-y-2">
                <Label>Corretor</Label>
                <Select
                  value={form.corretorId}
                  onValueChange={(corretorId) =>
                    setForm((atual) => ({ ...atual, corretorId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um corretor" />
                  </SelectTrigger>
                  <SelectContent>
                    {corretores.map((corretor) => (
                      <SelectItem key={corretor.id} value={corretor.id}>
                        {corretor.name} — {corretor.equipeNome}
                      </SelectItem>
                    ))}
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
                type="number"
                min="1"
                step="1"
                value={form.valor}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, valor: event.target.value }))
                }
                placeholder={form.tipo === "vgv" ? "Ex.: 500000" : "Ex.: 5"}
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
  const metasGerencia = metas.filter((meta) => meta.origem === "gerente");
  const metasPessoais = metas.filter((meta) => meta.origem === "pessoal");

  if (metas.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="font-medium">Metas da gerência</h3>
          <p className="text-sm text-muted-foreground">
            Metas definidas pelo gerente para este corretor.
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
            Nenhuma meta da gerência para este período.
          </p>
        )}
      </section>
      <section className="space-y-3">
        <div>
          <h3 className="font-medium">Metas pessoais</h3>
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
        return (
          <Card
            key={meta.id}
            className="group relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
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
                    </div>
                  </div>
                </div>
                <Badge
                  className={
                    meta.origem === "gerente"
                      ? "border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300"
                  }
                  variant="outline"
                >
                  {meta.origem === "gerente" ? "Gerência" : "Pessoal"}
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
                  {meta.origem === "gerente"
                    ? `Definida por ${meta.criador.name}`
                    : "Definida por você"}
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
      iconBg: "bg-sky-500/15",
      iconColor: "text-sky-600 dark:text-sky-400",
      progress: "bg-sky-500",
    };
  }
  if (tipo === "vgv") {
    return {
      icon: Wallet,
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-600 dark:text-violet-400",
      progress: "bg-violet-500",
    };
  }
  return {
    icon: Target,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    progress: "bg-amber-500",
  };
}

function EmptyState({ admin = false }: { admin?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed py-12 text-center">
      <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">Nenhuma meta ativa</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {admin
          ? "As metas das equipes aparecerão aqui."
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
        maximumFractionDigits: 0,
      })
    : valor.toLocaleString("pt-BR");
}
