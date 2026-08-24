import { cn } from "@/lib/utils";
import { docStatus1FunilTagClasses } from "@/lib/documentacao-status";

/** Tag do Status 1 da documentação no card do funil (pill + bolinha). */
export function DocStatus1FunilTag({
  status1,
  className,
}: {
  status1: string | null | undefined;
  className?: string;
}) {
  const label = status1?.trim();
  if (!label) return null;
  const { wrap, dot } = docStatus1FunilTagClasses(label);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
        wrap,
        className,
      )}
      title={`Documentação · Status 1 · ${label}`}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
