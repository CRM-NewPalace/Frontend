import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Identifica lead da carteira pessoal do gerente (não da equipe). */
export function MeuLeadBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 shrink-0 px-1.5 text-[9px] border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300",
        className,
      )}
      title="Lead da sua carteira, não da equipe"
    >
      Meu lead
    </Badge>
  );
}
