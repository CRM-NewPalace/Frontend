import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

function parseTime(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return { hour: "09", minute: "00" };
  const hour = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(
    2,
    "0",
  );
  const rawMin = Math.min(59, Math.max(0, Number(match[2])));
  // Snap to nearest 5 min for the picker list.
  const snapped = Math.round(rawMin / 5) * 5;
  const minute = String(snapped === 60 ? 55 : snapped).padStart(2, "0");
  return { hour, minute };
}

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
};

export function TimePicker({
  id,
  value,
  onChange,
  placeholder = "Horário",
  allowClear = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseTime(value || "09:00"), [value]);

  function pick(hour: string, minute: string) {
    onChange(`${hour}:${minute}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start font-normal tabular-nums",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Escolher horário
          </p>
          {allowClear && value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Limpar
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <div className="space-y-1">
            <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Hora
            </p>
            <ScrollArea className="h-48 w-[72px] rounded-md border">
              <div className="flex flex-col p-1">
                {HOURS.map((hour) => {
                  const active = (value ? selected.hour : "") === hour;
                  return (
                    <button
                      key={hour}
                      type="button"
                      className={cn(
                        "rounded-md px-2 py-1.5 text-sm tabular-nums transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                      onClick={() =>
                        pick(hour, value ? selected.minute : "00")
                      }
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-1">
            <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Min
            </p>
            <ScrollArea className="h-48 w-[72px] rounded-md border">
              <div className="flex flex-col p-1">
                {MINUTES.map((minute) => {
                  const active = (value ? selected.minute : "") === minute;
                  return (
                    <button
                      key={minute}
                      type="button"
                      className={cn(
                        "rounded-md px-2 py-1.5 text-sm tabular-nums transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                      onClick={() =>
                        pick(value ? selected.hour : "09", minute)
                      }
                    >
                      {minute}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setOpen(false)}
          disabled={!value}
        >
          Confirmar {value || ""}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
