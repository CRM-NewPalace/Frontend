import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  disconnectGoogleCalendar,
  fetchGoogleCalendarStatus,
  googleCalendarConnectHref,
  type GoogleCalendarStatus,
} from "@/lib/google-calendar-api";
import { CalendarDays, Loader2, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

export function ConfigConexoesPanel() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchGoogleCalendarStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDisconnect = useCallback(async (thenConnect = false) => {
    setBusy(true);
    try {
      await disconnectGoogleCalendar();
      setStatus({
        configured: true,
        connected: false,
        googleEmail: null,
      });
      if (thenConnect) {
        window.location.assign(googleCalendarConnectHref());
        return;
      }
      toast.success(
        "Google Agenda desconectada. Os eventos já criados no Google permanecem lá.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível desconectar o Google.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google Agenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Compromissos criados ou alterados no CRM são enviados para o seu
          Google Agenda. O Google não altera a agenda do CRM.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando conexão…
          </div>
        ) : !status?.configured ? (
          <p className="text-sm text-muted-foreground">
            A integração Google Agenda não está disponível neste ambiente.
          </p>
        ) : status.connected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Conectado</p>
              <p className="truncate text-sm text-muted-foreground">
                {status.googleEmail ?? "Google Agenda"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void handleDisconnect(true)}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Trocar conta
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => void handleDisconnect(false)}
              >
                <Unplug className="mr-1.5 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              window.location.assign(googleCalendarConnectHref());
            }}
          >
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Conectar Google Agenda
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
