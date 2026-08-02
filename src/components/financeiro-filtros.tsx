import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERIODO_OPTIONS,
  STATUS_OPTIONS,
  type PeriodoFiltro,
  type StatusTitulo,
} from "@/lib/financeiro-mock";
import { Search, X } from "lucide-react";

export function MockBanner() {
  return (
    <Badge
      variant="outline"
      className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 font-normal"
    >
      Dados demonstrativos — módulo sem API
    </Badge>
  );
}

export function FinanceiroFiltrosBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  periodo,
  onPeriodoChange,
  status,
  onStatusChange,
  tipo,
  onTipoChange,
  tipoOptions,
  extra,
  onClear,
  hasActive,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  periodo?: PeriodoFiltro;
  onPeriodoChange?: (v: PeriodoFiltro) => void;
  status?: StatusTitulo | "todos";
  onStatusChange?: (v: StatusTitulo | "todos") => void;
  tipo?: string;
  onTipoChange?: (v: string) => void;
  tipoOptions?: { value: string; label: string }[];
  extra?: ReactNode;
  onClear?: () => void;
  hasActive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
      {onSearchChange != null && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}
      {onPeriodoChange != null && (
        <Select
          value={periodo}
          onValueChange={(v) => onPeriodoChange(v as PeriodoFiltro)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIODO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onStatusChange != null && (
        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as StatusTitulo | "todos")}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onTipoChange != null && tipoOptions && (
        <Select value={tipo} onValueChange={onTipoChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {tipoOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {extra}
      {hasActive && onClear && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
