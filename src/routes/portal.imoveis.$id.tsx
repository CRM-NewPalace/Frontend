import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { formatBrl } from "@/lib/captacao-api";
import { ImovelFichaVisao } from "@/components/imovel-ficha-visao";
import {
  fetchPortalChaves,
  fetchPortalContrato,
  fetchPortalDocumentacao,
  fetchPortalFechamento,
  fetchPortalHistorico,
  fetchPortalImovel,
  fetchPortalPosVenda,
  fetchPortalPropostas,
  fetchPortalVisitas,
  PORTAL_SITUACAO_LABEL,
  type PortalImovelDetalhe,
} from "@/lib/portal-api";
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
        </div>
        <p className="text-sm text-muted-foreground">
          {formatBrl(imovel.precoVenda ?? imovel.valorPretendido)}
        </p>
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
            {imovel.captacao && <p>Responsável: {imovel.captacao.responsavel}</p>}
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
            {((extra.Documentação as Array<{
              id: string;
              nome: string;
              status: string;
              updatedAt: string;
            }>) ?? []).map((doc) => (
              <p key={doc.id}>
                {doc.status === "aprovado" ? "✓" : "○"} {doc.nome} · {doc.status} ·{" "}
                {formatDate(doc.updatedAt)}
              </p>
            ))}
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
