import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { getSession, updateMe, type AuthUser } from "@/lib/auth";
import {
  CRECI_PROCESSO_HINT,
  CRECI_PROCESSO_LABEL,
  normalizeCreciStatus,
  userCanInformarCreci,
} from "@/lib/users-api";
import { IdCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ConfigCreciPanel({
  compact = false,
  onSaved,
}: {
  compact?: boolean;
  onSaved?: (user: AuthUser) => void;
}) {
  const [user, setUser] = useState<AuthUser | null>(() => getSession());
  const [creci, setCreci] = useState(user?.creci ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = getSession();
    setUser(session);
    setCreci(session?.creci ?? "");
  }, []);

  if (!user || !userCanInformarCreci(user)) return null;

  const status = normalizeCreciStatus(user.creciStatus, user.creci);

  async function handleSave() {
    const valor = creci.trim();
    if (valor && valor.length < 3) {
      toast.error("Informe o CRECI com ao menos 3 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMe({ creci: valor || null });
      setUser(updated);
      setCreci(updated.creci ?? "");
      onSaved?.(updated);
      toast.success(
        valor ? "CRECI salvo no seu cadastro." : "CRECI removido do cadastro.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar o CRECI.",
      );
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Informe o número do seu CRECI para aparecer em documentos, vendas e no
        cadastro da imobiliária.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="meu-creci">Número do CRECI</Label>
        <Input
          id="meu-creci"
          value={creci}
          onChange={(event) => setCreci(event.target.value)}
          placeholder="Ex.: 12345-F"
          maxLength={40}
        />
        <p className="text-xs text-muted-foreground">
          {CRECI_PROCESSO_HINT[status]} Andamento atual:{" "}
          {CRECI_PROCESSO_LABEL[status]}.
        </p>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : (
            "Salvar CRECI"
          )}
        </Button>
      </div>
    </div>
  );

  if (compact) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IdCard className="h-4 w-4 text-primary" />
          Meu CRECI
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
