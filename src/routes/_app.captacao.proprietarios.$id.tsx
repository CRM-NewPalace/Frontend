import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import {
  fetchProprietario,
  type Proprietario,
} from "@/lib/captacao-api";
import { formatCpfCnpj } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/proprietarios/$id")({
  component: ProprietarioDetalhePage,
});

function ProprietarioDetalhePage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<Proprietario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchProprietario(id)
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
        title={item.nome}
        description={`${item.tipoPessoa === "juridica" ? "Pessoa jurídica" : "Pessoa física"} · ${item.telefone || "sem telefone"}`}
        actions={
          <Button asChild size="sm">
            <Link to="/captacao/imoveis" search={{ proprietarioId: item.id }}>
              Cadastrar imóvel
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>E-mail: {item.email || "—"}</p>
            <p>
              {item.tipoPessoa === "juridica" ? "CNPJ" : "CPF"}:{" "}
              {item.cpfCnpj ? formatCpfCnpj(item.cpfCnpj) : "—"}
            </p>
            <p>Observações: {item.observacoes || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imóveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(item.imoveis ?? []).length === 0 ? (
              <p className="text-muted-foreground">Nenhum imóvel.</p>
            ) : (
              item.imoveis!.map((imovel) => (
                <Link
                  key={imovel.id}
                  to="/captacao/imoveis/$id"
                  params={{ id: imovel.id }}
                  className="block hover:underline"
                >
                  {imovel.titulo}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
