import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
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
import { BarChart3, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas — NP Connect" }] }),
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
        (isAdmin || isGerente) ? fetchEquipes() : Promise.resolve([]),
      ]);
      setMetas(itens);
      setEquipes(equipesAtuais);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível carregar as metas.");
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
        corretor:
          metasDoCorretor[0]?.corretor ?? {
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
      toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar a meta.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(meta: Meta) {
    if (!window.confirm(`Excluir a meta de ${META_TIPO_LABEL[meta.tipo].toLowerCase()}?`)) return;
    try {
      await deleteMeta(meta.id);
      toast.success("Meta excluída.");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível excluir a meta.");
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
          canCreate ? <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            {isGerente ? "Definir meta" : "Minha meta"}
          </Button> : undefined
        }
      />
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando metas...</div>
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
                <span className="text-sm text-muted-foreground">{corretor.equipe?.name ?? "Sem equipe"}</span>
              </div>
              <MetasPorOrigem
                metas={metasDoCorretor}
                canEdit={(meta) => isGerente && meta.origem === "gerente" && meta.criadorId === user?.id}
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
            <DialogTitle>{editing ? "Editar meta" : isGerente ? "Definir meta para a equipe" : "Criar minha meta"}</DialogTitle>
            <DialogDescription>
              Metas diárias, semanais e mensais são acompanhadas separadamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {isGerente && !editing && (
              <div className="space-y-2">
                <Label>Corretor</Label>
                <Select value={form.corretorId} onValueChange={(corretorId) => setForm((atual) => ({ ...atual, corretorId }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
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
                <Select value={form.tipo} disabled={Boolean(editing)} onValueChange={(tipo: MetaTipo) => setForm((atual) => ({ ...atual, tipo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{META_TIPOS.map((tipo) => <SelectItem key={tipo} value={tipo}>{META_TIPO_LABEL[tipo]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={form.periodo} disabled={Boolean(editing)} onValueChange={(periodo: MetaPeriodo) => setForm((atual) => ({ ...atual, periodo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{META_PERIODOS.map((periodo) => <SelectItem key={periodo} value={periodo}>{META_PERIODO_LABEL[periodo]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{form.tipo === "vgv" ? "Valor em R$" : "Quantidade"}</Label>
              <Input type="number" min="1" step="1" value={form.valor} onChange={(event) => setForm((atual) => ({ ...atual, valor: event.target.value }))} placeholder={form.tipo === "vgv" ? "Ex.: 500000" : "Ex.: 5"} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar meta"}</Button>
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
          <MetaList metas={metasGerencia} canEdit={canEdit} onEdit={onEdit} onRemove={onRemove} />
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
          <MetaList metas={metasPessoais} canEdit={canEdit} onEdit={onEdit} onRemove={onRemove} />
        ) : (
          <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Nenhuma meta pessoal para este período.
          </p>
        )}
      </section>
    </div>
  );
}

function MetaList({ metas, canEdit, onEdit, onRemove }: { metas: Meta[]; canEdit: (meta: Meta) => boolean; onEdit: (meta: Meta) => void; onRemove: (meta: Meta) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metas.map((meta) => {
        const editavel = canEdit(meta);
        return (
          <Card key={meta.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{META_TIPO_LABEL[meta.tipo]}</CardTitle>
                  <CardDescription>{META_PERIODO_LABEL[meta.periodo]}</CardDescription>
                </div>
                <Badge variant={meta.origem === "gerente" ? "default" : "secondary"}>
                  {meta.origem === "gerente" ? "Gerência" : "Pessoal"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">{formatValor(meta.atual, meta.tipo)} <span className="text-sm font-normal text-muted-foreground">de {formatValor(meta.valor, meta.tipo)}</span></p>
                <span className="text-sm font-medium">{meta.percentual}%</span>
              </div>
              <Progress value={meta.percentual} />
              <p className="text-xs text-muted-foreground">
                {meta.origem === "gerente" ? `Definida por ${meta.criador.name}` : "Definida por você"}
              </p>
              {editavel && <div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => onEdit(meta)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onRemove(meta)}><Trash2 className="h-4 w-4" /></Button></div>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function EmptyState({ admin = false }: { admin?: boolean }) {
  return <div className="rounded-lg border border-dashed py-12 text-center"><BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Nenhuma meta ativa</p><p className="mt-1 text-sm text-muted-foreground">{admin ? "As metas das equipes aparecerão aqui." : "Defina uma meta para começar o acompanhamento."}</p></div>;
}

function formatValor(valor: number, tipo: MetaTipo) {
  return tipo === "vgv"
    ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : valor.toLocaleString("pt-BR");
}
