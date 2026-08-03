import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { useCatalog } from "@/lib/catalog-store";
import { nextCatalogColor } from "@/lib/catalog-colors";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  value: string;
  outroValue: string;
  onChange: (value: string) => void;
  onOutroChange: (value: string) => void;
  selectId?: string;
  outroId?: string;
};

/**
 * Seleção de motivo de perda a partir do catálogo, com criação/edição rápida.
 */
export function LostMotivoFields({
  value,
  outroValue,
  onChange,
  onOutroChange,
  selectId = "lost-motivo",
  outroId = "lost-motivo-outro",
}: Props) {
  const { catalog, addItem, updateItem } = useCatalog();
  const motivos = catalog.motivo_perda;
  const selected = motivos.find((m) => m.label === value) ?? null;

  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editorLabel, setEditorLabel] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);

  function openCreate() {
    setEditorMode("create");
    setEditorLabel("");
  }

  function openEdit() {
    if (!selected) {
      toast.error("Selecione um motivo cadastrado para editar.");
      return;
    }
    setEditorMode("edit");
    setEditorLabel(selected.label);
  }

  function closeEditor() {
    setEditorMode(null);
    setEditorLabel("");
  }

  async function saveEditor() {
    const label = editorLabel.trim();
    if (label.length < 2) {
      toast.error("Informe o motivo (mín. 2 caracteres).");
      return;
    }
    setEditorSaving(true);
    try {
      if (editorMode === "create") {
        await addItem({
          type: "motivo_perda",
          label,
          color: nextCatalogColor(motivos.length),
        });
        onChange(label);
        toast.success(`Motivo "${label}" adicionado.`);
      } else if (editorMode === "edit" && selected) {
        await updateItem(selected.id, { label });
        onChange(label);
        toast.success("Motivo atualizado.");
      }
      closeEditor();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o motivo.",
      );
    } finally {
      setEditorSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={selectId} className="text-xs text-muted-foreground">
            Motivo
          </Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Novo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={!selected}
              onClick={openEdit}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Editar
            </Button>
          </div>
        </div>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={selectId} className="h-10">
            <SelectValue placeholder="Selecione o motivo" />
          </SelectTrigger>
          <SelectContent>
            {motivos.map((m) => (
              <SelectItem key={m.id} value={m.label}>
                {m.label}
              </SelectItem>
            ))}
            <SelectItem value="__outro__">Outro…</SelectItem>
          </SelectContent>
        </Select>
        {motivos.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Nenhum motivo cadastrado ainda. Use &quot;Novo&quot; ou
            Configurações.
          </p>
        )}
      </div>

      {value === "__outro__" && (
        <div className="space-y-1.5">
          <Label htmlFor={outroId} className="text-xs text-muted-foreground">
            Descreva o motivo
          </Label>
          <Input
            id={outroId}
            value={outroValue}
            onChange={(e) => onOutroChange(e.target.value)}
            placeholder="Ex.: Cliente sem interesse"
            className="h-10"
          />
        </div>
      )}

      {editorMode && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">
              {editorMode === "create"
                ? "Novo motivo de perda"
                : "Editar motivo"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={closeEditor}
              aria-label="Fechar editor"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Input
            value={editorLabel}
            onChange={(e) => setEditorLabel(e.target.value)}
            autoFocus
            placeholder="Ex.: Sem retorno"
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveEditor();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                closeEditor();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeEditor}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={editorSaving}
              onClick={() => void saveEditor()}
            >
              {editorSaving && (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
