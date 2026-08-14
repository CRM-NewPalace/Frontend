import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONSTRUTORA_CORES_PRESET,
  construtoraBadgeStyle,
} from "@/lib/construtoras-api";

type CorPickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  previewLabel?: string;
  disabled?: boolean;
};

export function CorPicker({
  id = "cor",
  label = "Cor do nome",
  value,
  onChange,
  previewLabel,
  disabled,
}: CorPickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          type="color"
          value={value || "#3b82f6"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-14 cursor-pointer p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#3b82f6"
          maxLength={7}
          className="max-w-[140px] font-mono text-sm"
        />
        {!disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            Limpar
          </Button>
        ) : null}
        {previewLabel?.trim() && value ? (
          <Badge
            variant="secondary"
            className="border-transparent"
            style={construtoraBadgeStyle(value)}
          >
            {previewLabel.trim()}
          </Badge>
        ) : null}
      </div>
      {!disabled ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {CONSTRUTORA_CORES_PRESET.map((hex) => (
            <button
              key={hex}
              type="button"
              title={hex}
              className="h-7 w-7 rounded-full border border-border"
              style={{ backgroundColor: hex }}
              onClick={() => onChange(hex)}
              disabled={disabled}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
