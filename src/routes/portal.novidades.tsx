import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import { ApiError } from "@/lib/api";
import { fetchPortalNovidades, type PortalNovidade } from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/novidades")({
  ssr: false,
  component: PortalNovidadesPage,
});

function PortalNovidadesPage() {
  const [items, setItems] = useState<PortalNovidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalNovidades()
      .then(setItems)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

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
        title="Novidades"
        subtitle="O que aconteceu nos seus imóveis nos últimos 14 dias."
      />
      {items.length === 0 ? (
        <PortalEmpty>Nenhuma novidade no período.</PortalEmpty>
      ) : (
        <ol className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to="/portal/imoveis/$id"
                params={{ id: item.imovelId }}
                className="block rounded-2xl border border-slate-100 bg-white p-4 hover:border-[#148ea3]/40"
              >
                <p className="text-[11px] text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")} · {item.identificacao}
                </p>
                <p className="mt-1 text-sm text-slate-700">{item.texto}</p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
