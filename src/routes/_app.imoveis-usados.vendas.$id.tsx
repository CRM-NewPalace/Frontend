import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
} from "@/lib/captacao-api";
import { fetchFunis, type Funil } from "@/lib/funis-api";
import {
  fetchInteressadosUsado,
  fetchMatching,
  fetchUsadosResponsaveis,
  fetchVendaUsado,
  formatBrl,
  INTERESSE_STATUS_LABEL,
  removerVinculo,
  updateVendaUsado,
  updateVinculo,
  VENDA_STATUS_LABEL,
  vincularInteressado,
  type InteresseUsadoStatus,
  type InteressadoUsado,
  type VendaUsado,
  type VendaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/vendas/$id")({
  component: VendaUsadoDetalhePage,
});

const STATUS_OPTS: VendaUsadoStatus[] = [
  "disponivel",
  "reservado",
  "vendido",
  "indisponivel",
];

const INTERESSE_OPTS: InteresseUsadoStatus[] = [
  "novo",
  "em_contato",
  "interessado",
  "sem_interesse",
  "descartado",
];

function VendaUsadoDetalhePage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<VendaUsado | null>(null);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [responsaveis, setResponsaveis] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [matching, setMatching] = useState<InteressadoUsado[]>([]);
  const [todos, setTodos] = useState<InteressadoUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preco, setPreco] = useState("");
  const [addId, setAddId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [venda, list, users, match, all] = await Promise.all([
        fetchVendaUsado(id),
        fetchFunis("venda_usados"),
        fetchUsadosResponsaveis(),
        fetchMatching(id),
        fetchInteressadosUsado(),
      ]);
      setItem(venda);
      setFunis(list);
      setResponsaveis(users);
      setMatching(match);
      setTodos(all);
      setPreco(
        venda.precoVenda != null ? formatMoneyInput(venda.precoVenda) : "",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const etapas =
    funis.find((f) => f.id === item?.funil.id)?.etapas.filter((e) => e.active) ??
    [];
  const linkedIds = new Set((item?.vinculos ?? []).map((v) => v.interessado.id));
  const disponiveis = todos.filter((i) => !linkedIds.has(i.id));

  async function patch(body: Record<string, unknown>, ok: string) {
    setSaving(true);
    try {
      const updated = await updateVendaUsado(id, body);
      setItem(updated);
      toast.success(ok);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !item) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  const im = item.imovel;

  return (
    <>
      <PageHeader
        title="Venda de usado"
        description={`${im.titulo} · ${im.proprietario?.nome ?? ""}`}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Tipo: {CAPTACAO_IMOVEL_TIPO_LABEL[im.tipo]}</p>
              <p>
                Endereço: {im.logradouro}, {im.numero}
                {im.complemento ? ` — ${im.complemento}` : ""}
              </p>
              <p>
                {im.bairro} · {im.cidade}/{im.estado}
              </p>
              <p>Área: {im.area ?? "—"} m²</p>
              <p>
                Quartos: {im.quartos ?? "—"} · Banheiros: {im.banheiros ?? "—"} ·
                Vagas: {im.vagas ?? "—"}
              </p>
              <p>Preço de venda: {formatBrl(item.precoVenda)}</p>
              <p>
                Proprietário:{" "}
                {im.proprietarioId ? (
                  <Link
                    to="/captacao/proprietarios/$id"
                    params={{ id: im.proprietarioId }}
                    className="hover:underline"
                  >
                    {im.proprietario?.nome ?? "—"}
                  </Link>
                ) : (
                  im.proprietario?.nome ?? "—"
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comercialização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label>Status</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={item.status}
                  disabled={saving}
                  onChange={(e) =>
                    void patch(
                      { status: e.target.value },
                      "Status atualizado.",
                    )
                  }
                >
                  {STATUS_OPTS.map((s) => (
                    <option key={s} value={s}>
                      {VENDA_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Responsável</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={item.responsavel.id}
                  disabled={saving}
                  onChange={(e) =>
                    void patch(
                      { responsavelId: e.target.value },
                      "Responsável atualizado.",
                    )
                  }
                >
                  {responsaveis.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Preço de venda</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0,00"
                  value={preco}
                  onChange={(e) => setPreco(maskMoneyInput(e.target.value))}
                />
                <Button
                  className="mt-2"
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    void patch(
                      { precoVenda: parseOptionalMoneyInput(preco) },
                      "Preço atualizado.",
                    )
                  }
                >
                  Salvar preço
                </Button>
              </div>
              <p>Funil: {item.funil.name}</p>
              <div>
                <Label>Etapa atual</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={item.funilEtapa.id}
                  disabled={saving}
                  onChange={(e) =>
                    void patch(
                      { funilEtapaId: e.target.value },
                      "Etapa atualizada.",
                    )
                  }
                >
                  {etapas.map((etapa) => (
                    <option key={etapa.id} value={etapa.id}>
                      {etapa.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-muted-foreground">
                Disponibilizado em{" "}
                {new Date(item.dataDisponibilizacao).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interessados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(item.vinculos ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum interessado vinculado.
                </p>
              ) : (
                <ul className="space-y-3">
                  {item.vinculos!.map((v) => (
                    <li key={v.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{v.interessado.nome}</span>
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          value={v.interesse}
                          disabled={saving}
                          onChange={(e) => {
                            setSaving(true);
                            void updateVinculo(id, v.id, {
                              interesse: e.target.value as InteresseUsadoStatus,
                            })
                              .then(setItem)
                              .then(() => toast.success("Interesse atualizado."))
                              .catch((err) =>
                                toast.error(
                                  err instanceof ApiError
                                    ? err.message
                                    : "Não foi possível atualizar.",
                                ),
                              )
                              .finally(() => setSaving(false));
                          }}
                        >
                          {INTERESSE_OPTS.map((s) => (
                            <option key={s} value={s}>
                              {INTERESSE_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        className="mt-2"
                        placeholder="Observação"
                        defaultValue={v.observacoes}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === v.observacoes) return;
                          void updateVinculo(id, v.id, { observacoes: value })
                            .then(setItem)
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível salvar a observação.",
                              ),
                            );
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 px-0"
                        onClick={() => {
                          void removerVinculo(id, v.id)
                            .then(setItem)
                            .then(() => {
                              toast.success("Interessado removido.");
                              return fetchMatching(id).then(setMatching);
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível remover.",
                              ),
                            );
                        }}
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 min-w-40 flex-1 rounded-md border bg-background px-3 text-sm"
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                >
                  <option value="">Adicionar interessado</option>
                  {disponiveis.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!addId || saving}
                  onClick={() => {
                    setSaving(true);
                    void vincularInteressado(id, { interessadoId: addId })
                      .then(setItem)
                      .then(() => {
                        setAddId("");
                        toast.success("Interessado vinculado.");
                        return fetchMatching(id).then(setMatching);
                      })
                      .catch((err) =>
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível vincular.",
                        ),
                      )
                      .finally(() => setSaving(false));
                  }}
                >
                  Adicionar
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/imoveis-usados/interessados">Cadastrar novo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Possíveis interessados</CardTitle>
            </CardHeader>
            <CardContent>
              {matching.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum perfil compatível ainda (tipo, cidade, faixa de preço e
                  características).
                </p>
              ) : (
                <ul className="space-y-2">
                  {matching.map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{i.nome}</p>
                        <p className="text-muted-foreground">
                          {formatBrl(i.precoMin)} — {formatBrl(i.precoMax)}
                          {i.quartosMin != null ? ` · ${i.quartosMin} quartos` : ""}
                          {i.cidade ? ` · ${i.cidade}` : ""}
                          {i.bairros ? ` · ${i.bairros}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void vincularInteressado(id, { interessadoId: i.id })
                            .then(setItem)
                            .then(() => {
                              toast.success("Interessado vinculado.");
                              return fetchMatching(id).then(setMatching);
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível vincular.",
                              ),
                            );
                        }}
                      >
                        Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {(item.historicos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {item.historicos!.map((h) => (
                  <li key={h.id} className="border-b pb-2 last:border-0">
                    <p className="whitespace-pre-line">{h.texto}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.autor?.name ?? "Sistema"} ·{" "}
                      {new Date(h.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
