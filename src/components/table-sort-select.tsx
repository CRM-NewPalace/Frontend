import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TABLE_SORT_OPTIONS,
  type TableSort,
} from "@/lib/table-sort";
import { cn } from "@/lib/utils";

export function TableSortSelect({
  value,
  onChange,
  className,
}: {
  value: TableSort;
  onChange: (value: TableSort) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TableSort)}>
      <SelectTrigger className={cn("w-52 h-9", className)}>
        <SelectValue placeholder="Ordenar" />
      </SelectTrigger>
      <SelectContent>
        {TABLE_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
