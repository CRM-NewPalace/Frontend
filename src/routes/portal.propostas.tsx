import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import { ApiError } from "@/lib/api";
import { formatBrl } from "@/lib/captacao-api";
import { fetchPortalPropostasCarteira } from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/propostas")({
  ssr: false,
  component: PortalPropostasPage,
});

function PortalPropostasPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPortalPropostasCarteira>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalPropostasCarteira()
      .then(setRows)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  const itens = rows.flatMap((row) =>
    row.propostas.map((proposta) => ({ ...proposta, imovel: row.imovel })),
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageTitle
        title="Propostas"
        subtitle="Valores e status sem identificar o interessado."
      />
      {itens.length === 0 ? (
        <PortalEmpty>
          Ainda não há propostas. Elas aparecem quando o imóvel entra em venda de usados.
        </PortalEmpty>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <Link
              key={item.id}
              to="/portal/imoveis/$id"
              params={{ id: item.imovel.id }}
              className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-[#148ea3]/40"
            >
              <p className="text-sm font-semibold text-[#12343d]">{item.imovel.identificacao}</p>
              <p className="mt-1 text-sm text-slate-600">
                Proposta #{item.numero} · {formatBrl(item.valor)} · {item.status}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
