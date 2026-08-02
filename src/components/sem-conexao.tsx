import type { ReactNode } from "react";
import { Unplug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE =
  "Sem conexão com o banco de dados. Este módulo ainda não possui API.";

/**
 * Estado vazio para telas/seções sem endpoint no backend.
 * Remova quando a conexão com a API for criada.
 */
export function SemConexao({
  title = "Sem conexão",
  description = DEFAULT_MESSAGE,
  className,
  compact,
}: {
  title?: string;
  description?: string;
  className?: string;
  /** Versão menor para cards / células. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-6 text-center",
          className,
        )}
      >
        <Unplug className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground/80 max-w-[220px]">
          {description}
        </p>
      </div>
    );
  }

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Unplug className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Botão desabilitado com indicação visual de “sem conexão”. */
export function BotaoSemConexao({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      disabled
      className={cn(className)}
      title={DEFAULT_MESSAGE}
    >
      {children}
    </Button>
  );
}
