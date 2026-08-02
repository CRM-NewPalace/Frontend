import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import {
  distribuirLeadsCorretores,
  distribuirLeadsEquipes,
  fetchDistribuirResumo,
  type DistribuirResumo,
} from "@/lib/leads-api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const rem = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

export function LeadsDistribuirDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumo, setResumo] = useState<DistribuirResumo | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [porCorretor, setPorCorretor] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDistribuirResumo();
      setResumo(data);
      if (data.modo === "equipes") {
        const split = splitEvenly(data.disponiveis, data.equipes.length);
        const next: Record<string, number> = {};
        data.equipes.forEach((eq, i) => {
          next[eq.equipeId] = split[i] ?? 0;
        });
        setQuantidades(next);
      } else {
        setPorCorretor(1);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a distribuição.",
      );
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const somaEquipes = useMemo(
    () => Object.values(quantidades).reduce((s, n) => s + (Number(n) || 0), 0),
    [quantidades],
  );

  function autoDividir() {
    if (!resumo || resumo.modo !== "equipes") return;
    const split = splitEvenly(resumo.disponiveis, resumo.equipes.length);
    const next: Record<string, number> = {};
    resumo.equipes.forEach((eq, i) => {
      next[eq.equipeId] = split[i] ?? 0;
    });
    setQuantidades(next);
  }

  async function handleConfirm() {
    if (!resumo) return;
    if (resumo.modo === "equipes") {
      if (somaEquipes <= 0) {
        toast.error("Informe quantidades maiores que zero.");
        return;
      }
      if (somaEquipes > resumo.disponiveis) {
        toast.error(
          `A soma (${somaEquipes}) ultrapassa os ${resumo.disponiveis} leads disponíveis.`,
        );
        return;
      }
    } else if (porCorretor < 1) {
      toast.error("Informe ao menos 1 lead por corretor na fila.");
      return;
    }

    setSaving(true);
    try {
      if (resumo.modo === "equipes") {
        const result = await distribuirLeadsEquipes(
          resumo.equipes.map((eq) => ({
            equipeId: eq.equipeId,
            quantidade: Number(quantidades[eq.equipeId]) || 0,
          })),
        );
        toast.success(
          `${result.total} lead(s) enviados às equipes. Os gerentes podem redistribuir.`,
        );
      } else {
        const result = await distribuirLeadsCorretores(porCorretor);
        const detalhe = result.distribuicao
          .map((d) => `${d.nome}: ${d.quantidade}`)
          .join(" · ");
        toast.success(`${result.total} lead(s) distribuídos. ${detalhe}`);
      }
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível distribuir os leads.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Distribuir leads</DialogTitle>
          <DialogDescription>
            {resumo?.modo === "equipes"
              ? "Divida os leads sem dono entre as equipes. O gerente de cada equipe redistribui aos corretores."
              : resumo?.equipeId
                ? "Defina quantos leads cada corretor recebe por rodada da fila (round-robin)."
                : "Não há equipes cadastradas. Defina quantos leads cada corretor recebe por rodada da fila."}
          </DialogDescription>
        </DialogHeader>

        {loading || !resumo ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando…
          </div>
        ) : (
          <div className="space-y-4 overflow-auto flex-1 min-h-0">
            <p className="text-sm">
              Disponíveis:{" "}
              <span className="font-semibold tabular-nums">
                {resumo.disponiveis}
              </span>
            </p>

            {resumo.modo === "equipes" ? (
              <>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={autoDividir}
                  >
                    Dividir automaticamente
                  </Button>
                </div>
                {resumo.equipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma equipe cadastrada. Crie equipes em Administração →
                    Equipes, ou feche e abra de novo para distribuir direto aos
                    corretores.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {resumo.equipes.map((eq) => (
                      <div
                        key={eq.equipeId}
                        className="flex items-center gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {eq.nome}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Gerente: {eq.gerente} · {eq.corretores} corretor
                            {eq.corretores === 1 ? "" : "es"}
                          </div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          className="w-24 h-9"
                          value={quantidades[eq.equipeId] ?? 0}
                          onChange={(e) =>
                            setQuantidades((prev) => ({
                              ...prev,
                              [eq.equipeId]: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Soma: {somaEquipes} / {resumo.disponiveis}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {resumo.equipeId ? "Equipe: " : "Escopo: "}
                  <span className="text-foreground">{resumo.equipeNome}</span>
                  {" · "}
                  {resumo.corretores.length} corretor
                  {resumo.corretores.length === 1 ? "" : "es"}
                </p>
                {resumo.corretores.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Cadastre corretores ativos em Usuários para poder
                    distribuir.
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="por-corretor">
                    Leads por corretor em cada rodada da fila
                  </Label>
                  <Input
                    id="por-corretor"
                    type="number"
                    min={1}
                    className="w-32"
                    value={porCorretor}
                    onChange={(e) =>
                      setPorCorretor(Math.max(1, Number(e.target.value) || 1))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex.: 1 = um para cada; 5 = cada corretor recebe 5, depois o
                    próximo, até acabar o pool.
                  </p>
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-5">
                  {resumo.corretores.map((c) => (
                    <li key={c.id}>{c.nome}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              saving ||
              loading ||
              !resumo ||
              resumo.disponiveis === 0 ||
              (resumo.modo === "equipes" && resumo.equipes.length === 0) ||
              (resumo.modo === "corretores" && resumo.corretores.length === 0)
            }
            onClick={() => void handleConfirm()}
          >
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Confirmar distribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
