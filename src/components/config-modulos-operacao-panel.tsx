import { useCallback, useEffect, useState } from "react";
import { Building2, Home, KeyRound, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession } from "@/lib/auth";
import {
  fetchTenantOperationModules,
  updateTenantOperationModules,
  type TenantOperationModules,
} from "@/lib/tenant-company-api";
import { toast } from "sonner";

const CARDS: Array<{
  key: keyof TenantOperationModules;
  title: string;
  description: string;
  icon: typeof Home;
  locked?: boolean;
}> = [
  {
    key: "comercial",
    title: "Comercial",
    description:
      "CRM de lançamentos: leads, funil de vendas e operação atual da imobiliária.",
    icon: Building2,
    locked: true,
  },
  {
    key: "captacao",
    title: "Captação de Imóveis",
    description: "Gerencie proprietários, imóveis e processos de captação.",
    icon: Home,
  },
  {
    key: "imoveisUsados",
    title: "Venda de Imóveis Usados",
    description:
      "Gerencie a venda de imóveis usados, interessados, visitas e propostas.",
    icon: Landmark,
  },
  {
    key: "locacao",
    title: "Locação",
    description: "Gerencie locatários, contratos e operações de locação.",
    icon: KeyRound,
  },
];

export function ConfigModulosOperacaoPanel() {
  const [ops, setOps] = useState<TenantOperationModules | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const isAdmin = getSession()?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTenantOperationModules();
      setOps(data.operations);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as operações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: "captacao" | "imoveisUsados" | "locacao") {
    if (!ops || !isAdmin) return;
    const next = !ops[key];
    setSavingKey(key);
    try {
      const data = await updateTenantOperationModules({ [key]: next });
      setOps(data.operations);
      await fetchMe();
      toast.success(
        next
          ? "Operação ativada. Os funis já cadastrados continuam disponíveis."
          : "Operação desativada. Nada foi apagado — o funil permanece no cadastro.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a operação.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Escolha quais operações esta imobiliária utiliza. Desativar esconde o
        menu e o acesso; funis e dados permanecem salvos.
      </p>
      {loading && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const on = ops ? ops[card.key] : card.key === "comercial";
          return (
            <Card key={card.key}>
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <div className="rounded-lg border bg-muted/40 p-2">
                  <Icon className="h-5 w-5 text-brand-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Badge variant={on ? "default" : "secondary"}>
                  {on ? "Ativado" : "Desativado"}
                </Badge>
                {card.locked ? (
                  <span className="text-xs text-muted-foreground">
                    Sempre ativo no CRM
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={on}
                      disabled={!ops || !isAdmin || savingKey === card.key}
                      onCheckedChange={() =>
                        void toggle(
                          card.key as "captacao" | "imoveisUsados" | "locacao",
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={on ? "outline" : "default"}
                      disabled={!ops || !isAdmin || savingKey === card.key}
                      onClick={() =>
                        void toggle(
                          card.key as "captacao" | "imoveisUsados" | "locacao",
                        )
                      }
                    >
                      {on ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
