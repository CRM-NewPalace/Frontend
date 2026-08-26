import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  CAPTACAO_IMOVEL_TIPOS,
  createCaptacaoImovel,
  fetchCaptacaoImoveis,
  fetchProprietarios,
  formatBrl,
  updateCaptacaoImovel,
  type CaptacaoImovelTipo,
  type Imovel,
  type Proprietario,
} from "@/lib/captacao-api";
import { FILTER_BAR_SHELL, FILTER_CONTROL } from "@/lib/filter-bar";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

type Search = { proprietarioId?: string };

export const Route = createFileRoute("/_app/captacao/imoveis")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    proprietarioId:
      typeof search.proprietarioId === "string" ? search.proprietarioId : undefined,
  }),
  component: CaptacaoImoveisPage,
});

const emptyForm = {
  proprietarioId: "",
  tipo: "apartamento" as CaptacaoImovelTipo,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  area: "",
  quartos: "",
  observacoes: "",
};

function CaptacaoImoveisPage() {
  const { proprietarioId } = Route.useSearch();
  const [items, setItems] = useState<Imovel[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Imovel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [list, props] = await Promise.all([
        fetchCaptacaoImoveis({ proprietarioId }),
        fetchProprietarios(),
      ]);
      setItems(list);
      setProprietarios(props);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível listar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proprietarioId]);

  function num(v: string) {
    if (!v.trim()) return undefined;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.proprietarioId) {
      toast.error("Selecione o proprietário.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        area: num(form.area),
        quartos: num(form.quartos),
      };
      if (editing) {
        await updateCaptacaoImovel(editing.id, body);
        toast.success("Imóvel atualizado.");
      } else {
        await createCaptacaoImovel(body);
        toast.success("Imóvel cadastrado.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Imóveis"
        description="Imóveis individuais vinculados aos proprietários."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setForm({
                ...emptyForm,
                proprietarioId: proprietarioId ?? "",
              });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Novo imóvel
          </Button>
        }
      />
      <div className={FILTER_BAR_SHELL}>
        {proprietarioId ? (
          <p className="text-sm text-muted-foreground">
            Filtrado por proprietário.
          </p>
        ) : null}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imóvel</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Captação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Nenhum imóvel cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/captacao/imoveis/$id"
                      params={{ id: item.id }}
                      className="hover:underline"
                    >
                      {item.titulo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {item.proprietario ? (
                      <Link
                        to="/captacao/proprietarios/$id"
                        params={{ id: item.proprietario.id }}
                        className="hover:underline"
                      >
                        {item.proprietario.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]}</TableCell>
                  <TableCell>{item.cidade || "—"}</TableCell>
                  <TableCell className="text-right">{formatBrl(item.valor)}</TableCell>
                  <TableCell>
                    {item.captacao ? (
                      <Link
                        to="/captacao/captacoes/$id"
                        params={{ id: item.captacao.id }}
                        className="hover:underline"
                      >
                        {item.captacao.etapa ?? "Ver"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar imóvel" : "Novo imóvel"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div>
                <Label>Proprietário</Label>
                <select
                  className={`flex h-9 w-full rounded-md border px-3 text-sm ${FILTER_CONTROL}`}
                  value={form.proprietarioId}
                  onChange={(e) =>
                    setForm({ ...form, proprietarioId: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {proprietarios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tipo</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.tipo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tipo: e.target.value as CaptacaoImovelTipo,
                    })
                  }
                >
                  {CAPTACAO_IMOVEL_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {CAPTACAO_IMOVEL_TIPO_LABEL[tipo]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Logradouro</Label>
                <Input
                  value={form.logradouro}
                  onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Número</Label>
                  <Input
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input
                    value={form.estado}
                    maxLength={2}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Área (m²)</Label>
                  <Input
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quartos</Label>
                  <Input
                    value={form.quartos}
                    onChange={(e) => setForm({ ...form, quartos: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
