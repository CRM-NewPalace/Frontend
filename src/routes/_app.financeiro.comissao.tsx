import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EMPREENDIMENTOS } from "@/lib/empreendimentos-newpalace";
import { brl } from "@/lib/mock-data";
import {
  calcComissao,
  useComissao,
  DEFAULT_PCT_IMOBILIARIA,
  DEFAULT_PCT_NF,
  DEFAULT_PCT_CORRETOR,
  type ComissaoCalculo,
} from "@/lib/comissao-store";
import { Percent, Trash2, Calculator, DollarSign, Wallet, ArrowUp, Building2, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/comissao")({
  head: () => ({ meta: [{ title: "Comissão — Financeiro" }] }),
  component: ComissaoPage,
});

const VGV_MES_ANTERIOR = 580000;
const VGV_ATUAL = 720000;
const VGV_PREVISTO = 850000;

function parseNumber(value: string) {
  const n = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ComissaoPage() {
  const { comissoes, addComissao, deleteComissao } = useComissao();

  const [empreendimentoId, setEmpreendimentoId] = useState(EMPREENDIMENTOS[0]?.id ?? "");
  const [vgvStr, setVgvStr] = useState("");
  const [pctImobiliariaStr, setPctImobiliariaStr] = useState(String(DEFAULT_PCT_IMOBILIARIA));
  const [pctNfStr, setPctNfStr] = useState(String(DEFAULT_PCT_NF));
  const [pctCorretorStr, setPctCorretorStr] = useState(String(DEFAULT_PCT_CORRETOR));
  const [deleteTarget, setDeleteTarget] = useState<ComissaoCalculo | null>(null);

  const totais = useMemo(() => {
    const vgv = comissoes.reduce((s, c) => s + c.vgv, 0);
    const imobiliaria = comissoes.reduce((s, c) => s + c.valorImobiliaria, 0);
    const nf = comissoes.reduce((s, c) => s + c.valorNf, 0);
    const corretor = comissoes.reduce((s, c) => s + c.valorCorretor, 0);
    const liquido = comissoes.reduce((s, c) => s + c.valorLiquido, 0);
    return { vgv, imobiliaria, nf, corretor, liquido, qtd: comissoes.length };
  }, [comissoes]);

  const empreendimento = useMemo(
    () => EMPREENDIMENTOS.find((e) => e.id === empreendimentoId),
    [empreendimentoId],
  );

  const preview = useMemo(() => {
    const vgv = parseNumber(vgvStr);
    const pctImobiliaria = parseNumber(pctImobiliariaStr);
    const pctNf = parseNumber(pctNfStr);
    const pctCorretor = parseNumber(pctCorretorStr);
    if (
      !Number.isFinite(vgv) ||
      vgv <= 0 ||
      !Number.isFinite(pctImobiliaria) ||
      pctImobiliaria < 0 ||
      !Number.isFinite(pctNf) ||
      pctNf < 0 ||
      !Number.isFinite(pctCorretor) ||
      pctCorretor < 0
    ) {
      return null;
    }
    return {
      vgv,
      pctImobiliaria,
      pctNf,
      pctCorretor,
      ...calcComissao(vgv, pctImobiliaria, pctNf, pctCorretor),
    };
  }, [vgvStr, pctImobiliariaStr, pctNfStr, pctCorretorStr]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!empreendimento) {
      toast.error("Selecione um empreendimento.");
      return;
    }
    if (!preview) {
      toast.error("Preencha o VGV e as porcentagens.");
      return;
    }
    if (preview.pctNf > 100 || preview.pctCorretor > 100) {
      toast.error("As porcentagens de NF e corretor devem ser no máximo 100%.");
      return;
    }

    const nums = comissoes.map((c) => Number(c.id.replace(/\D/g, ""))).filter(Number.isFinite);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;

    addComissao({
      id: `cm${next}`,
      empreendimentoId: empreendimento.id,
      empreendimentoNome: empreendimento.titulo,
      vgv: preview.vgv,
      pctImobiliaria: preview.pctImobiliaria,
      pctNf: preview.pctNf,
      pctCorretor: preview.pctCorretor,
      valorImobiliaria: preview.valorImobiliaria,
      valorNf: preview.valorNf,
      valorAposNf: preview.valorAposNf,
      valorCorretor: preview.valorCorretor,
      valorLiquido: preview.valorLiquido,
      createdAt: new Date().toISOString(),
    });

    toast.success("Cálculo de comissão salvo.");
    setVgvStr("");
  }

  return (
    <div>
      <PageHeader
        title="Comissão"
        description="Comissão da imobiliária sobre o VGV → menos NF → do restante, menos o % do corretor."
      />

      <div className="grid grid-cols-3 gap-4 w-full mb-4">
        <Card className="shadow-sm min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">mês anterior</span>
            </div>
            <div className="mt-3 text-xl sm:text-2xl font-semibold tabular-nums break-all">{brl(VGV_MES_ANTERIOR)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">VGV do mês anterior</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs flex items-center gap-0.5 text-success shrink-0">
                <ArrowUp className="w-3 h-3" />
                +24%
              </span>
            </div>
            <div className="mt-3 text-xl sm:text-2xl font-semibold tabular-nums break-all">{brl(VGV_ATUAL)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">VGV atual</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs flex items-center gap-0.5 text-success shrink-0">
                <ArrowUp className="w-3 h-3" />
                +18%
              </span>
            </div>
            <div className="mt-3 text-xl sm:text-2xl font-semibold tabular-nums break-all">{brl(VGV_PREVISTO)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">VGV previsto</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
              <span className="text-xs flex items-center gap-0.5 text-success">
                <ArrowUp className="w-3 h-3" />
                {totais.qtd} calc.
              </span>
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">{brl(totais.imobiliaria)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Comissão imobiliária</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">{brl(totais.nf)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">NF</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">{brl(totais.corretor)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Corretor</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">{brl(totais.liquido)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Líquido imobiliária</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Novo cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Empreendimento</Label>
                <Select value={empreendimentoId} onValueChange={setEmpreendimentoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPREENDIMENTOS.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vgv">VGV — valor total do empreendimento (R$)</Label>
                <Input
                  id="vgv"
                  inputMode="decimal"
                  value={vgvStr}
                  onChange={(e) => setVgvStr(e.target.value)}
                  placeholder="Ex: 290000"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pct-imob">% Comissão imobiliária</Label>
                  <Input
                    id="pct-imob"
                    inputMode="decimal"
                    value={pctImobiliariaStr}
                    onChange={(e) => setPctImobiliariaStr(e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pct-nf">% NF (sobre a comissão)</Label>
                  <Input
                    id="pct-nf"
                    inputMode="decimal"
                    value={pctNfStr}
                    onChange={(e) => setPctNfStr(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pct-corr">% Corretor (sobre o restante)</Label>
                  <Input
                    id="pct-corr"
                    inputMode="decimal"
                    value={pctCorretorStr}
                    onChange={(e) => setPctCorretorStr(e.target.value)}
                    placeholder="35"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Comissão sobre o VGV → menos NF → do que sobrar, menos % do corretor.
              </p>

              <Button type="submit" className="w-full sm:w-auto" disabled={!preview}>
                <Percent className="w-4 h-4 mr-1.5" />
                Salvar cálculo
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <p className="text-sm text-muted-foreground">
                Informe o VGV e as porcentagens para ver o cálculo em tempo real.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VGV (valor total)</span>
                  <span className="font-medium tabular-nums">{brl(preview.vgv)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Comissão imobiliária ({preview.pctImobiliaria.toLocaleString("pt-BR")}% do VGV)
                  </span>
                  <span className="font-semibold tabular-nums text-primary">
                    {brl(preview.valorImobiliaria)}
                  </span>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      (−) NF ({preview.pctNf.toLocaleString("pt-BR")}% da comissão)
                    </span>
                    <span className="tabular-nums text-destructive">− {brl(preview.valorNf)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Após NF</span>
                    <span className="tabular-nums font-medium">{brl(preview.valorAposNf)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      (−) Corretor ({preview.pctCorretor.toLocaleString("pt-BR")}% do restante)
                    </span>
                    <span className="tabular-nums text-destructive">− {brl(preview.valorCorretor)}</span>
                  </div>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold">= Líquido imobiliária</span>
                  <span className="text-xl font-bold tabular-nums text-primary">
                    {brl(preview.valorLiquido)}
                  </span>
                </div>
                {empreendimento && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Empreendimento: {empreendimento.titulo}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empreendimento</TableHead>
              <TableHead>VGV</TableHead>
              <TableHead>Comissão imob.</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Líquido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Nenhum cálculo salvo.
                </TableCell>
              </TableRow>
            ) : (
              comissoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.empreendimentoNome}</TableCell>
                  <TableCell className="tabular-nums">{brl(c.vgv)}</TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {c.pctImobiliaria}% · {brl(c.valorImobiliaria)}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {c.pctNf}% · {brl(c.valorNf)}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {c.pctCorretor}% · {brl(c.valorCorretor)}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{brl(c.valorLiquido)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cálculo?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover o cálculo de {deleteTarget?.empreendimentoNome}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteComissao(deleteTarget.id);
                  toast.success("Cálculo excluído.");
                  setDeleteTarget(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
