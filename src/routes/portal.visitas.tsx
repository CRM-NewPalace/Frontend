import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import { ApiError } from "@/lib/api";
import { fetchPortalVisitasCarteira } from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/visitas")({
  ssr: false,
  component: PortalVisitasPage,
});

function PortalVisitasPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPortalVisitasCarteira>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalVisitasCarteira()
      .then(setRows)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  const itens = rows.flatMap((row) => {
    const all = [
      ...row.visitas.proximas.map((v) => ({ ...v, grupo: "Próxima" })),
      ...row.visitas.realizadas.map((v) => ({ ...v, grupo: "Realizada" })),
      ...row.visitas.canceladas.map((v) => ({ ...v, grupo: "Cancelada" })),
    ];
    return all.map((visita) => ({ ...visita, imovel: row.imovel }));
  });

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
        title="Visitas"
        subtitle="Agenda e feedbacks, sem o nome do interessado."
      />
      {itens.length === 0 ? (
        <PortalEmpty>Nenhuma visita registrada ainda.</PortalEmpty>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <Link
              key={item.id}
              to="/portal/imoveis/$id"
              params={{ id: item.imovel.id }}
              className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-[#148ea3]/40"
            >
              <p className="text-xs font-medium text-[#0d7a8c]">{item.grupo}</p>
              <p className="mt-1 text-sm font-semibold text-[#12343d]">{item.imovel.identificacao}</p>
              <p className="mt-1 text-sm text-slate-600">
                {new Date(item.dataHora).toLocaleString("pt-BR")} · {item.status}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
