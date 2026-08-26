import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  fetchCaptacaoImovel,
  formatBrl,
  type Imovel,
} from "@/lib/captacao-api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/imoveis/$id")({
  component: ImovelDetalhePage,
});

function ImovelDetalhePage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<Imovel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCaptacaoImovel(id)
      .then(setItem)
      .catch((err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível carregar.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (!item) return null;

  return (
    <>
      <PageHeader
        title={item.titulo}
        description={`${CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]} · ${item.cidade || "sem cidade"}`}
        actions={
          item.captacao ? (
            <Button asChild size="sm">
              <Link to="/captacao/captacoes/$id" params={{ id: item.captacao.id }}>
                Ver captação
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/captacao/captacoes">Criar captação</Link>
            </Button>
          )
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço e características</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Proprietário:{" "}
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
          </p>
          <p>
            {[item.logradouro, item.numero, item.bairro, item.cidade, item.estado]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          <p>CEP: {item.cep || "—"}</p>
          <p>Área: {item.area ?? "—"} m²</p>
          <p>Quartos: {item.quartos ?? "—"}</p>
          <p>Valor pretendido (captação): {formatBrl(item.valor)}</p>
        </CardContent>
      </Card>
    </>
  );
}
