import { useState } from "react";
import { UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  getHideClientesFromSidebar,
  setHideClientesFromSidebar,
} from "@/lib/clientes-nav-prefs";
import { toast } from "sonner";

export function ConfigHideClientesMenuCard() {
  const [hideClientes, setHideClientes] = useState(() =>
    getHideClientesFromSidebar(),
  );

  function toggleHideClientes(checked: boolean) {
    setHideClientes(checked);
    setHideClientesFromSidebar(checked);
    toast.success(
      checked
        ? "Clientes e Funil de Clientes ocultos do seu menu."
        : "Clientes e Funil de Clientes voltaram ao seu menu.",
    );
  }

  return (
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
            Preferência só sua. Os outros usuários do tenant continuam vendo o
            menu. As telas seguem acessíveis pelo endereço.
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Ocultar do menu</p>
          <p className="text-xs text-muted-foreground">
            Some Clientes e Funil de Clientes da sua barra lateral.
          </p>
        </div>
        <Switch
          checked={hideClientes}
          onCheckedChange={toggleHideClientes}
          aria-label="Ocultar Clientes e Funil de Clientes do menu"
        />
      </CardContent>
    </Card>
  );
}
