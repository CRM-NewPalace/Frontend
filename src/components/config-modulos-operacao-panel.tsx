import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Building2, Home, KeyRound, Landmark, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession, patchSessionTenantModules } from "@/lib/auth";
import {
  fetchTenantOperationModules,
  updateTenantOperationModules,
  type TenantOperationModules,
} from "@/lib/tenant-company-api";
import {
  getHideClientesFromSidebar,
  setHideClientesFromSidebar,
} from "@/lib/clientes-nav-prefs";
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
  const router = useRouter();
  const [ops, setOps] = useState<TenantOperationModules | null>(null);
  const [hideClientes, setHideClientes] = useState(() =>
    getHideClientesFromSidebar(),
  );
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const session = getSession();
  const isAdmin = session?.role === "admin";
  const isSolo = session?.tenant?.plano === "solo";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTenantOperationModules();
      setOps(data.operations);
      const serverHasPref =
        typeof data.modules?.hideClientesNav === "boolean";
      const hide = serverHasPref
        ? data.hideClientesNav === true
        : getHideClientesFromSidebar();
      setHideClientes(hide);
      setHideClientesFromSidebar(hide);
      if (!serverHasPref && hide && isAdmin) {
        const saved = await updateTenantOperationModules({
          hideClientesNav: true,
        });
        patchSessionTenantModules(saved.modules);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as operações.",
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

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
      patchSessionTenantModules(data.modules);
      await fetchMe();
      await router.invalidate();
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

  async function toggleHideClientes(checked: boolean) {
    if (!isAdmin) return;
    setHideClientes(checked);
    setHideClientesFromSidebar(checked);
    setSavingKey("hideClientesNav");
    try {
      const data = await updateTenantOperationModules({
        hideClientesNav: checked,
      });
      setOps(data.operations);
      setHideClientes(data.hideClientesNav === true);
      setHideClientesFromSidebar(data.hideClientesNav === true);
      patchSessionTenantModules(data.modules);
      await fetchMe();
      await router.invalidate();
      toast.success(
        checked
          ? "Clientes e Funil de Clientes ocultos do menu."
          : "Clientes e Funil de Clientes voltaram ao menu.",
      );
    } catch (err) {
      const previous = !checked;
      setHideClientes(previous);
      setHideClientesFromSidebar(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a visibilidade do menu.",
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
        {!isSolo ? (
          <Card>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <div className="rounded-lg border bg-muted/40 p-2">
                <UserCircle2 className="h-5 w-5 text-brand-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">
                  Clientes e Funil de Clientes
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Só oculta do menu. As telas continuam acessíveis se alguém
                  abrir o endereço.
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Ocultar do menu</p>
                <p className="text-xs text-muted-foreground">
                  Some Clientes e Funil de Clientes da barra lateral.
                </p>
              </div>
              <Switch
                checked={hideClientes}
                disabled={!isAdmin || savingKey === "hideClientesNav"}
                onCheckedChange={(checked) => void toggleHideClientes(checked)}
                aria-label="Ocultar Clientes e Funil de Clientes do menu"
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
