import { useRef } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_MAX_BYTES,
} from "@/lib/empreendimentos-api";

type ImageUploadFieldProps = {
  images: string[];
  max: number;
  label: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  shape?: "cover" | "logo";
  slotLabels?: string[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
};

export function ImageUploadField({
  images,
  max,
  label,
  hint,
  disabled,
  busy,
  shape = "cover",
  slotLabels,
  onAdd,
  onRemove,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = Math.max(0, max - images.length);
  const canAdd = !disabled && !busy && remaining > 0;

  function handleFiles(list: FileList | null) {
    if (!list?.length || !canAdd) return;
    const picked = [...list].slice(0, remaining);
    onAdd(picked);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-[11px] text-muted-foreground">
          {images.length}/{max}
        </span>
      </div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div
        className={cn(
          "grid gap-2",
          max > 1 && shape !== "logo" ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {Array.from({ length: max }, (_, index) => {
          const src = images[index];
          const slotLabel =
            slotLabels?.[index] ?? (max > 1 ? `Foto ${index + 1}` : "Adicionar");
          return (
            <div
              key={src ?? `slot-${index}`}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-muted/40",
                shape === "logo" ? "aspect-square max-w-28" : "aspect-video",
              )}
            >
              {src ? (
                <>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {!disabled ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-1.5 top-1.5 h-7 w-7"
                      disabled={busy}
                      title="Remover imagem"
                      onClick={() => onRemove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground transition-colors",
                    canAdd
                      ? "hover:bg-primary/10"
                      : "cursor-not-allowed opacity-60",
                    busy && "pointer-events-none opacity-70",
                  )}
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-primary" />
                  )}
                  <span>{busy ? "Enviando…" : slotLabel}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        multiple={remaining > 1}
        className="hidden"
        disabled={!canAdd}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

export function assertImageFile(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Envie uma imagem JPG, PNG ou WebP.";
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return "A imagem deve ter no máximo 5 MB.";
  }
  return null;
}
