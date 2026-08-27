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
import { getSession } from "@/lib/auth";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  type Imovel,
} from "@/lib/captacao-api";
import { fetchFunis, type Funil } from "@/lib/funis-api";
import { FILTER_BAR_SHELL, FILTER_CONTROL } from "@/lib/filter-bar";
import {
  StatusChip,
  TableFrame,
  vendaStatusTone,
} from "@/components/operacao-ui";
import { RowIconButton, TableRowActions } from "@/components/table-row-actions";
import { ImovelFotoThumb } from "@/components/imovel-foto-thumb";
import {
  createVendaUsado,
  fetchImoveisCaptados,
  fetchUsadosResponsaveis,
  fetchVendasUsado,
  formatBrl,
  VENDA_STATUS_LABEL,
  type VendaUsado,
  type VendaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { Eye, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/vendas/")({
  component: VendasUsadoPage,
});

const STATUS_OPTS: VendaUsadoStatus[] = [
  "disponivel",
  "reservado",
  "vendido",
  "indisponivel",
];

function VendasUsadoPage() {
  const me = getSession();
  const [items, setItems] = useState<VendaUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [captados, setCaptados] = useState<
    Array<Imovel & { precoSugerido: number | null }>
  >([]);
  const [responsaveis, setResponsaveis] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [filtros, setFiltros] = useState({
    cidade: "",
    bairro: "",
    tipo: "",
    status: "",
    responsavelId: "",
    precoMin: "",
    precoMax: "",
  });
  const [form, setForm] = useState({
    imovelId: "",
    responsavelId: me?.id ?? "",
    funilId: "",
    precoVenda: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(
        await fetchVendasUsado({
          cidade: filtros.cidade || undefined,
          bairro: filtros.bairro || undefined,
          tipo: filtros.tipo || undefined,
          status: filtros.status || undefined,
          responsavelId: filtros.responsavelId || undefined,
          precoMin: filtros.precoMin
            ? String(parseOptionalMoneyInput(filtros.precoMin) ?? "")
            : undefined,
          precoMax: filtros.precoMax
            ? String(parseOptionalMoneyInput(filtros.precoMax) ?? "")
            : undefined,
        }),
      );
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
    void fetchUsadosResponsaveis().then(setResponsaveis).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCreate() {
    const [ims, users, list] = await Promise.all([
      fetchImoveisCaptados(),
      fetchUsadosResponsaveis(),
      fetchFunis("venda_usados"),
    ]);
    setCaptados(ims);
    setResponsaveis(users);
    setFunis(list);
    const first = ims[0];
    setForm({
      imovelId: first?.id ?? "",
      responsavelId: me?.id ?? users[0]?.id ?? "",
      funilId: list.find((f) => f.ativo)?.id ?? list[0]?.id ?? "",
      precoVenda:
        first?.precoSugerido != null
          ? formatMoneyInput(first.precoSugerido)
          : "",
    });
    setOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createVendaUsado({
        imovelId: form.imovelId,
        responsavelId: form.responsavelId,
        funilId: form.funilId || undefined,
        precoVenda: parseOptionalMoneyInput(form.precoVenda) ?? undefined,
      });
      toast.success("Imóvel disponibilizado para venda.");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível disponibilizar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Imóveis à venda"
        description="Imóveis captados disponibilizados no funil de Venda de Usados."
        actions={
          <Button size="sm" onClick={() => void openCreate()}>
            <Plus className="mr-1 h-4 w-4" />
            Disponibilizar
          </Button>
        }
      />
      <div className={FILTER_BAR_SHELL}>
        <Input
          className={FILTER_CONTROL}
          placeholder="Cidade"
          value={filtros.cidade}
          onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
        />
        <Input
          className={FILTER_CONTROL}
          placeholder="Bairro"
          value={filtros.bairro}
          onChange={(e) => setFiltros({ ...filtros, bairro: e.target.value })}
        />
        <select
          className={`h-9 rounded-md border px-2 text-sm ${FILTER_CONTROL}`}
          value={filtros.tipo}
          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
        >
          <option value="">Tipo</option>
          {Object.entries(CAPTACAO_IMOVEL_TIPO_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={`h-9 rounded-md border px-2 text-sm ${FILTER_CONTROL}`}
          value={filtros.status}
          onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
        >
          <option value="">Status</option>
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>
              {VENDA_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className={`h-9 rounded-md border px-2 text-sm ${FILTER_CONTROL}`}
          value={filtros.responsavelId}
          onChange={(e) =>
            setFiltros({ ...filtros, responsavelId: e.target.value })
          }
        >
          <option value="">Responsável</option>
          {responsaveis.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <Input
          className={FILTER_CONTROL}
          placeholder="Preço mín."
          inputMode="numeric"
          value={filtros.precoMin}
          onChange={(e) =>
            setFiltros({ ...filtros, precoMin: maskMoneyInput(e.target.value) })
          }
        />
        <Input
          className={FILTER_CONTROL}
          placeholder="Preço máx."
          inputMode="numeric"
          value={filtros.precoMax}
          onChange={(e) =>
            setFiltros({ ...filtros, precoMax: maskMoneyInput(e.target.value) })
          }
        />
        <Button variant="outline" onClick={() => void load()}>
          Filtrar
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <TableFrame>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imóvel</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Interessados</TableHead>
              <TableHead className="w-[88px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  Nenhum imóvel disponibilizado ainda.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to="/imoveis-usados/vendas/$id"
                      params={{ id: item.id }}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <ImovelFotoThumb src={item.imovel.fotoUrl} alt="" />
                      <span>{item.imovel.titulo}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{item.imovel.proprietario?.nome ?? "—"}</TableCell>
                  <TableCell>{item.imovel.cidade}</TableCell>
                  <TableCell>{item.imovel.bairro}</TableCell>
                  <TableCell>{formatBrl(item.precoVenda)}</TableCell>
                  <TableCell>{item.responsavel.name}</TableCell>
                  <TableCell>
                    <StatusChip tone={vendaStatusTone(item.status)}>
                      {VENDA_STATUS_LABEL[item.status]}
                    </StatusChip>
                  </TableCell>
                  <TableCell>{item._count?.vinculos ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <TableRowActions>
                      <RowIconButton title="Ver detalhes" asChild>
                        <Link
                          to="/imoveis-usados/vendas/$id"
                          params={{ id: item.id }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </RowIconButton>
                      <RowIconButton title="Editar" asChild>
                        <Link
                          to="/imoveis-usados/vendas/$id"
                          params={{ id: item.id }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </RowIconButton>
                    </TableRowActions>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </TableFrame>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={(e) => void handleSave(e)}>
            <DialogHeader>
              <DialogTitle>Disponibilizar para venda</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Imóvel captado</Label>
                <select
                  required
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.imovelId}
                  onChange={(e) => {
                    const im = captados.find((i) => i.id === e.target.value);
                    setForm({
                      ...form,
                      imovelId: e.target.value,
                      precoVenda:
                        im?.precoSugerido != null
                          ? formatMoneyInput(im.precoSugerido)
                          : form.precoVenda,
                    });
                  }}
                >
                  <option value="">Selecione</option>
                  {captados.map((im) => (
                    <option key={im.id} value={im.id}>
                      {im.titulo} · {im.proprietario?.nome ?? ""}
                    </option>
                  ))}
                </select>
                {captados.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Só entram imóveis que já tenham captação e ainda não estejam
                    à venda.
                  </p>
                ) : null}
              </div>
              <div>
                <Label>Responsável</Label>
                <select
                  required
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.responsavelId}
                  onChange={(e) =>
                    setForm({ ...form, responsavelId: e.target.value })
                  }
                >
                  {responsaveis.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              {funis.length > 1 ? (
                <div>
                  <Label>Funil</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.funilId}
                    onChange={(e) =>
                      setForm({ ...form, funilId: e.target.value })
                    }
                  >
                    {funis.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.ativo ? " (ativo)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <Label>Preço de venda</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.precoVenda}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      precoVenda: maskMoneyInput(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !form.imovelId}>
                {saving ? "Salvando…" : "Disponibilizar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
