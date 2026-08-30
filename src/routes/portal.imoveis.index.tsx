import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { formatBrl } from "@/lib/captacao-api";
import {
  fetchPortalDashboard,
  PORTAL_SITUACAO_LABEL,
  type PortalImovelListItem,
} from "@/lib/portal-api";
import { situacaoTone, StatusChip, TableFrame } from "@/components/operacao-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImovelFotoThumb } from "@/components/imovel-foto-thumb";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/imoveis/")({
  ssr: false,
  component: PortalImoveisPage,
});

function PortalImoveisPage() {
  const [items, setItems] = useState<PortalImovelListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalDashboard()
      .then((data) => setItems(data.imoveis))
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Carteira
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Meus imóveis</h1>
        <p className="text-sm text-muted-foreground">
          Somente os imóveis vinculados a você.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum imóvel encontrado.</p>
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to="/portal/imoveis/$id"
                      params={{ id: item.id }}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <ImovelFotoThumb src={item.fotoUrl} alt="" />
                      <span>{item.identificacao}</span>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.endereco}
                      {item.bairro ? ` · ${item.bairro}` : ""}
                    </p>
                    {item.proximoPasso ? (
                      <p className="mt-1 text-xs text-foreground/80">{item.proximoPasso}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{item.cidade || "—"}</TableCell>
                  <TableCell>{formatBrl(item.valor)}</TableCell>
                  <TableCell>
                    <StatusChip tone={situacaoTone(item.situacao)}>
                      {PORTAL_SITUACAO_LABEL[item.situacao]}
                    </StatusChip>
                  </TableCell>
                  <TableCell>{item.responsavel || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </div>
  );
}
