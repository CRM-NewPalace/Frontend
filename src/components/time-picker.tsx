import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const parsed = useMemo(() => parseTime(value || "09:00"), [value]);
  const [draftHour, setDraftHour] = useState(parsed.hour);
  const [draftMinute, setDraftMinute] = useState(parsed.minute);

  useEffect(() => {
    if (!open) return;
    const next = parseTime(value || "09:00");
    setDraftHour(next.hour);
    setDraftMinute(next.minute);
  }, [open, value]);

  const draftLabel = `${draftHour}:${draftMinute}`;

  function confirm() {
    onChange(draftLabel);
    setOpen(false);
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
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="mb-3 flex items-center justify-between gap-2">
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

        <div className="mb-3 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Hora
          </p>
          <div className="grid grid-cols-6 gap-1">
            {HOURS.map((hour) => {
              const active = draftHour === hour;
              return (
                <button
                  key={hour}
                  type="button"
                  className={cn(
                    "h-8 rounded-md text-sm tabular-nums transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted",
                  )}
                  onClick={() => setDraftHour(hour)}
                >
                  {hour}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Minuto
          </p>
          <div className="grid grid-cols-6 gap-1">
            {MINUTES.map((minute) => {
              const active = draftMinute === minute;
              return (
                <button
                  key={minute}
                  type="button"
                  className={cn(
                    "h-8 rounded-md text-sm tabular-nums transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted",
                  )}
                  onClick={() => setDraftMinute(minute)}
                >
                  {minute}
                </button>
              );
            })}
          </div>
        </div>

        <Button type="button" size="sm" className="w-full" onClick={confirm}>
          Confirmar {draftLabel}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
