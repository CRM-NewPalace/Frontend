import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  CAPTACAO_IMOVEL_TIPOS,
  formatBrl,
  type CaptacaoImovelTipo,
} from "@/lib/captacao-api";
import { ImovelFichaVisao } from "@/components/imovel-ficha-visao";
import {
  cancelarPortalCaptacao,
  fetchPortalChaves,
  fetchPortalContrato,
  fetchPortalDocumentacao,
  fetchPortalFechamento,
  fetchPortalHistorico,
  fetchPortalImovel,
  fetchPortalPosVenda,
  fetchPortalPropostas,
  fetchPortalVisitas,
  registrarPortalAcao,
  updatePortalImovel,
  PORTAL_SITUACAO_LABEL,
  type PortalImovelDetalhe,
} from "@/lib/portal-api";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PillTabs, situacaoTone, StatusChip } from "@/components/operacao-ui";

export const Route = createFileRoute("/portal/imoveis/$id")({
  ssr: false,
  component: PortalImovelPage,
});

const TABS = [
  "Informações",
  "Histórico",
  "Comercialização",
  "Visitas",
  "Propostas",
  "Fechamento",
  "Documentação",
  "Contrato",
  "Chaves",
  "Pós-venda",
] as const;

type Tab = (typeof TABS)[number];

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  const d = new Date(value);
  return `${d.toLocaleDateString("pt-BR")} — ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function PortalImovelPage() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<Tab>("Informações");
  const [imovel, setImovel] = useState<PortalImovelDetalhe | null>(null);
  const [extra, setExtra] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [acaoBusy, setAcaoBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTipo, setEditTipo] = useState<CaptacaoImovelTipo>("casa");
  const [editLogradouro, setEditLogradouro] = useState("");
  const [editNumero, setEditNumero] = useState("");
  const [editComplemento, setEditComplemento] = useState("");
  const [editBairro, setEditBairro] = useState("");
  const [editCidade, setEditCidade] = useState("");
  const [editEstado, setEditEstado] = useState("");
  const [editCep, setEditCep] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editQuartos, setEditQuartos] = useState("");
  const [editSuites, setEditSuites] = useState("");
  const [editBanheiros, setEditBanheiros] = useState("");
  const [editVagas, setEditVagas] = useState("");
  const [editArea, setEditArea] = useState("");

  useEffect(() => {
    setLoading(true);
    void fetchPortalImovel(id)
      .then(setImovel)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!imovel) return;
    const loaders: Record<Tab, () => Promise<unknown>> = {
      Informações: async () => null,
      Histórico: () => fetchPortalHistorico(id),
      Comercialização: async () => null,
      Visitas: () => fetchPortalVisitas(id),
      Propostas: () => fetchPortalPropostas(id),
      Fechamento: () => fetchPortalFechamento(id),
      Documentação: () => fetchPortalDocumentacao(id),
      Contrato: () => fetchPortalContrato(id),
      Chaves: () => fetchPortalChaves(id),
      "Pós-venda": () => fetchPortalPosVenda(id),
    };
    void loaders[tab]()
      .then((data) => setExtra((prev) => ({ ...prev, [tab]: data })))
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      });
  }, [tab, id, imovel]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (!imovel) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/portal/imoveis" className="text-sm text-primary hover:underline">
          ← Meus imóveis
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{imovel.identificacao}</h1>
          <StatusChip tone={situacaoTone(imovel.situacao)}>
            {PORTAL_SITUACAO_LABEL[imovel.situacao]}
          </StatusChip>
          {imovel.captacao?.canceladoPeloProprietario ? (
            <StatusChip tone="orange">Cancelado por você</StatusChip>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatBrl(imovel.precoVenda ?? imovel.valorPretendido)}
        </p>
        {imovel.proximoPasso ? (
          <p className="mt-2 text-sm text-foreground/80">{imovel.proximoPasso}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={acaoBusy || imovel.acoes?.vi_e_concordo}
          onClick={() => {
            setAcaoBusy(true);
            void registrarPortalAcao(id, "vi_e_concordo")
              .then((res) => {
                setImovel((atual) =>
                  atual
                    ? {
                        ...atual,
                        acoes: { ...atual.acoes, vi_e_concordo: true, quero_falar: atual.acoes?.quero_falar ?? false },
                      }
                    : atual,
                );
                setExtra((prev) => {
                  const next = { ...prev };
                  delete next.Histórico;
                  return next;
                });
                toast.success(
                  res.jaRegistrado ? "Já estava registrado." : res.texto,
                );
              })
              .catch((err) => {
                toast.error(err instanceof ApiError ? err.message : "Não foi possível registrar.");
              })
              .finally(() => setAcaoBusy(false));
          }}
        >
          {imovel.acoes?.vi_e_concordo ? "Já registrado" : "Vi e concordo"}
        </Button>
        <Button
          type="button"
          disabled={acaoBusy || imovel.acoes?.quero_falar}
          onClick={() => {
            setAcaoBusy(true);
            void registrarPortalAcao(id, "quero_falar")
              .then((res) => {
                setImovel((atual) =>
                  atual
                    ? {
                        ...atual,
                        acoes: { vi_e_concordo: atual.acoes?.vi_e_concordo ?? false, quero_falar: true },
                      }
                    : atual,
                );
                setExtra((prev) => {
                  const next = { ...prev };
                  delete next.Histórico;
                  return next;
                });
                toast.success(
                  res.jaRegistrado ? "Já estava registrado." : res.texto,
                );
              })
              .catch((err) => {
                toast.error(err instanceof ApiError ? err.message : "Não foi possível registrar.");
              })
              .finally(() => setAcaoBusy(false));
          }}
        >
          {imovel.acoes?.quero_falar
            ? "Pedido já enviado"
            : "Quero falar com o corretor"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditTipo(
              CAPTACAO_IMOVEL_TIPOS.includes(imovel.tipo as CaptacaoImovelTipo)
                ? (imovel.tipo as CaptacaoImovelTipo)
                : "casa",
            );
            setEditLogradouro(imovel.logradouro);
            setEditNumero(imovel.numero);
            setEditComplemento(imovel.complemento);
            setEditBairro(imovel.bairro);
            setEditCidade(imovel.cidade);
            setEditEstado(imovel.estado);
            setEditCep(imovel.cep);
            setEditValor(
              imovel.valorPretendido != null ? String(imovel.valorPretendido) : "",
            );
            setEditDescricao(imovel.descricao ?? "");
            setEditQuartos(imovel.quartos != null ? String(imovel.quartos) : "");
            setEditSuites(imovel.suites != null ? String(imovel.suites) : "");
            setEditBanheiros(
              imovel.banheiros != null ? String(imovel.banheiros) : "",
            );
            setEditVagas(imovel.vagas != null ? String(imovel.vagas) : "");
            setEditArea(imovel.area != null ? String(imovel.area) : "");
            setEditOpen(true);
          }}
        >
          Editar informações
        </Button>
        {imovel.captacao && !imovel.captacao.canceladoPeloProprietario ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setCancelOpen(true)}
          >
            Cancelar captação
          </Button>
        ) : null}
      </div>
      <PillTabs
        items={TABS.map((label) => ({ id: label, label }))}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
      />
      {tab === "Informações" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p>
              Endereço: {imovel.logradouro}, {imovel.numero}
              {imovel.complemento ? ` — ${imovel.complemento}` : ""}
            </p>
            <p>
              {imovel.bairro} · {imovel.cidade}/{imovel.estado}
            </p>
            <p>Valor pretendido: {formatBrl(imovel.valorPretendido)}</p>
            <p>Avaliação: {formatBrl(imovel.valorAvaliacao)}</p>
            {imovel.contato?.corretor ? (
              <p>
                Corretor: {imovel.contato.corretor.nome}
                {imovel.contato.corretor.telefone
                  ? ` · ${imovel.contato.corretor.telefone}`
                  : ""}
                {imovel.contato.corretor.whatsapp
                  ? ` · WhatsApp ${imovel.contato.corretor.whatsapp}`
                  : ""}
              </p>
            ) : imovel.captacao ? (
              <p>Responsável: {imovel.captacao.responsavel}</p>
            ) : null}
            {imovel.contato?.imobiliaria.telefone ? (
              <p>
                Imobiliária {imovel.contato.imobiliaria.nome}:{" "}
                {imovel.contato.imobiliaria.telefone}
              </p>
            ) : null}
            <ImovelFichaVisao imovel={imovel} />
            {imovel.descricao ? (
              <p className="whitespace-pre-wrap">{imovel.descricao}</p>
            ) : null}
          </CardContent>
        </Card>
      )}
      {tab === "Histórico" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {((extra.Histórico as Array<{ id: string; texto: string; createdAt: string }>) ?? []).map(
              (item) => (
                <div key={item.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                  <p>{item.texto}</p>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      )}
      {tab === "Comercialização" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Comercialização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {imovel.comercializacao ? (
              <>
                <p>Status: {imovel.comercializacao.status}</p>
                <p>Preço: {formatBrl(imovel.comercializacao.preco)}</p>
                <p>Responsável: {imovel.comercializacao.responsavel}</p>
                <p>Interessados: {imovel.comercializacao.interessados}</p>
                <p>Visitas: {imovel.comercializacao.visitas}</p>
                <p>Propostas: {imovel.comercializacao.propostas}</p>
                <div className="pt-2 text-muted-foreground">
                  {Object.entries(imovel.comercializacao.interessadosResumo).map(
                    ([status, qtd]) => (
                      <p key={status}>
                        {qtd} {status.replace("_", " ")}
                      </p>
                    ),
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Este imóvel ainda não está em venda.</p>
            )}
          </CardContent>
        </Card>
      )}
      {tab === "Visitas" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Visitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {(["proximas", "realizadas", "canceladas"] as const).map((grupo) => {
              const visitas =
                (
                  extra.Visitas as
                    | {
                        proximas: Array<{
                          id: string;
                          dataHora: string;
                          status: string;
                          feedback: { comentarios: string | null } | null;
                        }>;
                        realizadas: Array<{
                          id: string;
                          dataHora: string;
                          status: string;
                          feedback: { comentarios: string | null } | null;
                        }>;
                        canceladas: Array<{ id: string; dataHora: string; status: string }>;
                      }
                    | undefined
                )?.[grupo] ?? [];
              return (
                <div key={grupo}>
                  <p className="mb-2 font-medium capitalize">{grupo.replace("proximas", "próximas")}</p>
                  {visitas.length === 0 ? (
                    <p className="text-muted-foreground">Nenhuma.</p>
                  ) : (
                    visitas.map((visita) => {
                      const comentarios =
                        "feedback" in visita &&
                        visita.feedback &&
                        typeof visita.feedback === "object" &&
                        "comentarios" in visita.feedback
                          ? String(
                              (visita.feedback as { comentarios?: string | null })
                                .comentarios ?? "",
                            )
                          : "";
                      return (
                      <div key={visita.id} className="mb-2 rounded-lg border p-3">
                        <p>{formatDateTime(visita.dataHora)}</p>
                        <p>Status: {visita.status}</p>
                        {comentarios ? (
                          <p className="mt-1 text-muted-foreground">
                            Feedback: {comentarios}
                          </p>
                        ) : null}
                      </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {tab === "Propostas" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Propostas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {((extra.Propostas as Array<{
              id: string;
              numero: string;
              valor: number | null;
              status: string;
              negociacao: {
                valorInicial: number | null;
                ultimaContraproposta: number | null;
                status: string;
              } | null;
            }>) ?? []).map((proposta) => (
              <div key={proposta.id} className="rounded-lg border p-3">
                <p className="font-medium">Proposta #{proposta.numero}</p>
                <p>Valor: {formatBrl(proposta.valor)}</p>
                <p>Status: {proposta.status}</p>
                {proposta.negociacao && (
                  <p className="mt-1 text-muted-foreground">
                    Inicial: {formatBrl(proposta.negociacao.valorInicial)} · Última
                    contraproposta: {formatBrl(proposta.negociacao.ultimaContraproposta)}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {tab === "Fechamento" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Fechamento</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {extra.Fechamento ? (
              <div className="space-y-2">
                <p>
                  Status:{" "}
                  {(extra.Fechamento as { status: string }).status}
                </p>
                <p>
                  Documentação{" "}
                  {(extra.Fechamento as { documentacao: { aprovados: number; total: number } })
                    .documentacao.aprovados}{" "}
                  de{" "}
                  {
                    (extra.Fechamento as { documentacao: { aprovados: number; total: number } })
                      .documentacao.total
                  }{" "}
                  documentos aprovados
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum fechamento iniciado.</p>
            )}
          </CardContent>
        </Card>
      )}
      {tab === "Documentação" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Documentação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(() => {
              const docs =
                (extra.Documentação as Array<{
                  id: string;
                  nome: string;
                  status: string;
                  updatedAt: string;
                }>) ?? [];
              const pendentes = docs.filter((doc) => doc.status !== "aprovado").length;
              return (
                <>
                  <p className="font-medium text-foreground">
                    {docs.length === 0
                      ? "A imobiliária ainda não abriu o checklist de documentação."
                      : pendentes === 0
                        ? "Tudo certo: não falta nenhum item do checklist."
                        : `Faltam ${pendentes} ${pendentes === 1 ? "item" : "itens"} no checklist.`}
                  </p>
                  {docs.map((doc) => (
                    <p key={doc.id}>
                      {doc.status === "aprovado" ? "✓" : "○"} {doc.nome} ·{" "}
                      {doc.status === "aprovado" ? "ok" : "pendente"} ·{" "}
                      {formatDate(doc.updatedAt)}
                    </p>
                  ))}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
      {tab === "Contrato" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Contrato</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {extra.Contrato ? (
              <div className="space-y-1">
                <p>Número: {(extra.Contrato as { numero: string }).numero}</p>
                <p>Status: {(extra.Contrato as { status: string }).status}</p>
                {(extra.Contrato as { assinado: boolean }).assinado && (
                  <p>✓ Contrato assinado</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum contrato registrado.</p>
            )}
          </CardContent>
        </Card>
      )}
      {tab === "Chaves" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Chaves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {extra.Chaves ? (
              <>
                <p>
                  Total: {(extra.Chaves as { resumo: { total: number } }).resumo.total}
                </p>
                <p>
                  {(extra.Chaves as { resumo: { disponivel: number } }).resumo.disponivel}{" "}
                  disponível ·{" "}
                  {(extra.Chaves as { resumo: { retirada: number } }).resumo.retirada} retirada
                  · {(extra.Chaves as { resumo: { entregue: number } }).resumo.entregue} entregue
                  ao comprador
                </p>
                {(
                  extra.Chaves as {
                    itens: Array<{
                      id: string;
                      identificacao: string;
                      historico: Array<{
                        id: string;
                        tipo: string;
                        createdAt: string;
                      }>;
                    }>;
                  }
                ).itens.map((chave) => (
                  <div key={chave.id} className="rounded-lg border p-3">
                    <p className="font-medium">{chave.identificacao}</p>
                    {chave.historico[0] && (
                      <p className="text-muted-foreground">
                        {chave.historico[0].tipo} · {formatDate(chave.historico[0].createdAt)}
                      </p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma chave cadastrada.</p>
            )}
          </CardContent>
        </Card>
      )}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar informações</DialogTitle>
            <DialogDescription>
              As alterações ficam visíveis para a imobiliária no funil de captação.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setSaving(true);
              const parsed = Number(editValor.replace(/\./g, "").replace(",", "."));
              const num = (raw: string) => {
                const n = Number(raw.replace(",", "."));
                return Number.isFinite(n) ? n : undefined;
              };
              void updatePortalImovel(id, {
                tipo: editTipo,
                cep: editCep.trim() || undefined,
                logradouro: editLogradouro.trim() || undefined,
                numero: editNumero.trim() || undefined,
                complemento: editComplemento.trim() || undefined,
                bairro: editBairro.trim() || undefined,
                cidade: editCidade.trim() || undefined,
                estado: editEstado.trim() || undefined,
                valorPretendido:
                  Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
                descricao: editDescricao.trim() || undefined,
                area: num(editArea),
                quartos: num(editQuartos),
                suites: num(editSuites),
                banheiros: num(editBanheiros),
                vagas: num(editVagas),
              })
                .then((updated) => {
                  setImovel(updated);
                  setEditOpen(false);
                  toast.success("Informações atualizadas.");
                })
                .catch((err) => {
                  toast.error(
                    err instanceof ApiError
                      ? err.message
                      : "Não foi possível salvar.",
                  );
                })
                .finally(() => setSaving(false));
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-tipo">Tipo</Label>
              <select
                id="edit-tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editTipo}
                onChange={(e) => setEditTipo(e.target.value as CaptacaoImovelTipo)}
              >
                {CAPTACAO_IMOVEL_TIPOS.map((item) => (
                  <option key={item} value={item}>
                    {CAPTACAO_IMOVEL_TIPO_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-logradouro">Endereço</Label>
                <Input
                  id="edit-logradouro"
                  value={editLogradouro}
                  onChange={(e) => setEditLogradouro(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-numero">Número</Label>
                <Input
                  id="edit-numero"
                  value={editNumero}
                  onChange={(e) => setEditNumero(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-complemento">Complemento</Label>
              <Input
                id="edit-complemento"
                value={editComplemento}
                onChange={(e) => setEditComplemento(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-bairro">Bairro</Label>
                <Input
                  id="edit-bairro"
                  value={editBairro}
                  onChange={(e) => setEditBairro(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cidade">Cidade</Label>
                <Input
                  id="edit-cidade"
                  value={editCidade}
                  onChange={(e) => setEditCidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-estado">UF</Label>
                <Input
                  id="edit-estado"
                  maxLength={2}
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cep">CEP</Label>
                <Input
                  id="edit-cep"
                  value={editCep}
                  onChange={(e) => setEditCep(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-valor">Valor pretendido</Label>
                <Input
                  id="edit-valor"
                  inputMode="decimal"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-area">Área (m²)</Label>
                <Input
                  id="edit-area"
                  inputMode="decimal"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-quartos">Quartos</Label>
                <Input
                  id="edit-quartos"
                  inputMode="numeric"
                  value={editQuartos}
                  onChange={(e) => setEditQuartos(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-suites">Suítes</Label>
                <Input
                  id="edit-suites"
                  inputMode="numeric"
                  value={editSuites}
                  onChange={(e) => setEditSuites(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-banheiros">Banheiros</Label>
                <Input
                  id="edit-banheiros"
                  inputMode="numeric"
                  value={editBanheiros}
                  onChange={(e) => setEditBanheiros(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-vagas">Vagas</Label>
                <Input
                  id="edit-vagas"
                  inputMode="numeric"
                  value={editVagas}
                  onChange={(e) => setEditVagas(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <textarea
                id="edit-descricao"
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving} className="bg-[#0f4c5c] hover:bg-[#0c3d4a]">
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a captação deste imóvel?</AlertDialogTitle>
            <AlertDialogDescription>
              A imobiliária verá no funil que você desistiu de anunciar. O corretor
              poderá entrar em contato ou registrar a perda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                setSaving(true);
                void cancelarPortalCaptacao(id)
                  .then((updated) => {
                    setImovel(updated);
                    setCancelOpen(false);
                    toast.success("Captação cancelada.");
                  })
                  .catch((err) => {
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Não foi possível cancelar.",
                    );
                  })
                  .finally(() => setSaving(false));
              }}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {tab === "Pós-venda" && (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pós-venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {extra["Pós-venda"] ? (
              <>
                <p>
                  Status: {(extra["Pós-venda"] as { status: string }).status}
                </p>
                {(
                  extra["Pós-venda"] as {
                    pendencias: Array<{ id: string; titulo: string; status: string }>;
                  }
                ).pendencias.map((item) => (
                  <p key={item.id}>
                    {item.status === "concluida" ? "✓" : "○"} {item.titulo}
                  </p>
                ))}
              </>
            ) : (
              <p className="text-muted-foreground">Nenhum acompanhamento de pós-venda.</p>
            )}
            <p className="pt-4 text-xs text-muted-foreground">
              Financeiro (repasses e extratos) estará disponível em uma etapa futura.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
