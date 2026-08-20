import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  createComissao,
  createTituloComissao,
  fetchVendasElegiveisComissao,
  fetchVendasElegiveisTituloComissao,
  updateComissao,
  type Comissao,
  type ComissaoRelacionamento,
  type ComissaoStatus,
  type VendaElegivelComissao,
} from "@/lib/financeiro-api";
import { brl, formatDate } from "@/lib/financeiro-mock";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Percent,
} from "lucide-react";

export type ComissaoFormState = {
  documentacaoId: string;
  dataPrevistaRecebimento: string;
  percentualImobiliaria: string;
  percentualTributos: string;
  percentualCorretor: string;
  percentualGerente: string;
  percentualCaixa: string;
  percentualSocios: string;
  status: ComissaoStatus;
};

const EMPTY_FORM: ComissaoFormState = {
  documentacaoId: "",
  dataPrevistaRecebimento: "",
  percentualImobiliaria: "",
  percentualTributos: "",
  percentualCorretor: "",
  percentualGerente: "",
  percentualCaixa: "",
  percentualSocios: "",
  status: "pendente",
};

const STATUS_OPTIONS: { value: ComissaoStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "liberada", label: "Liberada" },
  { value: "paga", label: "Paga" },
];

export function relationName(
  value?: string | ComissaoRelacionamento | null,
  fallback = "—",
) {
  if (typeof value === "string") return value || fallback;
  return value?.nome || value?.name || fallback;
}

export function numberValue(value: string | number | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toForm(comissao: Comissao): ComissaoFormState {
  return {
    documentacaoId: comissao.documentacaoId,
    dataPrevistaRecebimento: (comissao.dataPrevistaRecebimento ?? "").slice(
      0,
      10,
    ),
    percentualImobiliaria: String(comissao.percentualImobiliaria ?? ""),
    percentualTributos: String(comissao.percentualTributos ?? ""),
    percentualCorretor: String(comissao.percentualCorretor ?? ""),
    percentualGerente: String(comissao.percentualGerente ?? ""),
    percentualCaixa: String(comissao.percentualCaixa ?? ""),
    percentualSocios: String(comissao.percentualSocios ?? ""),
    status: comissao.status,
  };
}

export function ComissaoLancamentoDialog({
  open,
  onOpenChange,
  mode,
  editing,
  onSaved,
  via = "comissao",
  createSuccessMessage = "Comissão lançada — já aparece em Contas a receber.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  editing?: Comissao | null;
  onSaved?: (item: Comissao, context: { created: boolean }) => void;
  via?: "comissao" | "titulo";
  createSuccessMessage?: string;
}) {
  const [form, setForm] = useState<ComissaoFormState>(EMPTY_FORM);
  const [eligibleSales, setEligibleSales] = useState<VendaElegivelComissao[]>(
    [],
  );
  const [loadingSales, setLoadingSales] = useState(false);
  const [salePickerOpen, setSalePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEligibleSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      setEligibleSales(
        via === "titulo"
          ? await fetchVendasElegiveisTituloComissao()
          : await fetchVendasElegiveisComissao(),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as vendas elegíveis.",
      );
    } finally {
      setLoadingSales(false);
    }
  }, [via]);

  useEffect(() => {
    if (!open) {
      setSalePickerOpen(false);
      return;
    }
    if (mode === "edit" && editing) {
      setForm(toForm(editing));
      return;
    }
    setForm(EMPTY_FORM);
    void loadEligibleSales();
  }, [open, mode, editing, loadEligibleSales]);

  const selectedSale = useMemo(
    () =>
      eligibleSales.find((sale) => sale.documentacaoId === form.documentacaoId),
    [eligibleSales, form.documentacaoId],
  );
  const saleSummary = selectedSale ?? editing ?? null;

  const percentages = useMemo(
    () => ({
      percentualImobiliaria: numberValue(form.percentualImobiliaria),
      percentualTributos: numberValue(form.percentualTributos),
      percentualCorretor: numberValue(form.percentualCorretor),
      percentualGerente: numberValue(form.percentualGerente),
      percentualCaixa: numberValue(form.percentualCaixa),
      percentualSocios: numberValue(form.percentualSocios),
    }),
    [form],
  );
  const splitTotal =
    percentages.percentualCorretor +
    percentages.percentualGerente +
    percentages.percentualCaixa +
    percentages.percentualSocios;
  const preview = useMemo(() => {
    const vgv = numberValue(saleSummary?.vgv);
    const gross = (vgv * percentages.percentualImobiliaria) / 100;
    const taxes = (gross * percentages.percentualTributos) / 100;
    const net = gross - taxes;
    return {
      gross,
      taxes,
      net,
      broker: (net * percentages.percentualCorretor) / 100,
      manager: (net * percentages.percentualGerente) / 100,
      cash: (net * percentages.percentualCaixa) / 100,
      partners: (net * percentages.percentualSocios) / 100,
    };
  }, [percentages, saleSummary]);

  function setField<K extends keyof ComissaoFormState>(
    key: K,
    value: ComissaoFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "create" && !form.documentacaoId) {
      toast.error("Selecione uma venda elegível.");
      return;
    }
    if (percentages.percentualImobiliaria <= 0) {
      toast.error("Informe o percentual da imobiliária.");
      return;
    }
    if (!form.dataPrevistaRecebimento) {
      toast.error("Informe a data prevista de recebimento.");
      return;
    }
    if (
      Object.values(percentages).some(
        (value) => !Number.isFinite(value) || value < 0 || value > 100,
      )
    ) {
      toast.error("Os percentuais devem estar entre 0 e 100.");
      return;
    }
    if (Math.abs(splitTotal - 100) > 0.001) {
      toast.error("Corretor, gerente, caixa e sócios devem somar 100%.");
      return;
    }

    setSaving(true);
    try {
      const created = mode === "create";
      const saved =
        mode === "edit" && editing
          ? await updateComissao(editing.id, {
              ...percentages,
              dataPrevistaRecebimento: form.dataPrevistaRecebimento,
              status: form.status,
            })
          : via === "titulo"
            ? (
                await createTituloComissao({
                  documentacaoId: form.documentacaoId,
                  dataPrevistaRecebimento: form.dataPrevistaRecebimento,
                  ...percentages,
                })
              ).comissao
            : await createComissao({
                documentacaoId: form.documentacaoId,
                dataPrevistaRecebimento: form.dataPrevistaRecebimento,
                ...percentages,
              });
      onOpenChange(false);
      toast.success(created ? createSuccessMessage : "Comissão atualizada.");
      onSaved?.(saved, { created });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a comissão.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Percent className="size-5" />}
      title={mode === "create" ? "Lançar comissão" : "Editar comissão"}
      description="Defina a data prevista de recebimento e os percentuais antes de salvar."
      className="max-w-3xl"
      footer={
        <FormDialogActions
          hint={`Distribuição: ${splitTotal.toLocaleString("pt-BR")}% de 100%`}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" form="commission-form" disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Salvar comissão
          </Button>
        </FormDialogActions>
      }
    >
      <form
        id="commission-form"
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <FormDialogBody>
          {mode === "create" && (
            <FormSection title="Venda elegível">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Venda</Label>
                  <span className="text-xs text-muted-foreground">
                    {loadingSales
                      ? "Carregando…"
                      : `${eligibleSales.length} elegível(is)`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Todas as vendas ficam disponíveis e podem receber mais de um
                  lançamento de comissão.
                </p>
                <Popover open={salePickerOpen} onOpenChange={setSalePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="h-auto min-h-10 w-full justify-between py-2 font-normal"
                      disabled={loadingSales}
                    >
                      {loadingSales ? (
                        "Carregando vendas…"
                      ) : selectedSale ? (
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-medium">
                            {relationName(selectedSale.cliente)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {relationName(selectedSale.empreendimento)} ·{" "}
                            {formatDate(selectedSale.dataVenda)} ·{" "}
                            {brl(numberValue(selectedSale.vgv))}
                          </span>
                        </span>
                      ) : (
                        "Selecione uma venda"
                      )}
                      {loadingSales ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-(--radix-popover-trigger-width) p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar cliente, corretor ou empreendimento…" />
                      <CommandList className="max-h-72">
                        <CommandEmpty>Nenhuma venda elegível.</CommandEmpty>
                        <CommandGroup>
                          {eligibleSales.map((sale) => (
                            <CommandItem
                              key={sale.documentacaoId}
                              value={`${relationName(sale.cliente)} ${relationName(sale.empreendimento)} ${relationName(sale.corretor)} ${formatDate(sale.dataVenda)} ${sale.documentacaoId}`}
                              onSelect={() => {
                                setField("documentacaoId", sale.documentacaoId);
                                setSalePickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "size-4 shrink-0",
                                  form.documentacaoId === sale.documentacaoId
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {relationName(sale.cliente)}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {relationName(sale.empreendimento)} ·{" "}
                                  {relationName(sale.corretor)}
                                </p>
                                <p className="truncate text-xs tabular-nums text-muted-foreground">
                                  {formatDate(sale.dataVenda)} ·{" "}
                                  {brl(numberValue(sale.vgv))}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </FormSection>
          )}

          {saleSummary && (
            <FormSection title="Resumo da venda">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Summary
                  label="Cliente"
                  value={relationName(saleSummary.cliente)}
                />
                <Summary
                  label="Empreendimento"
                  value={relationName(saleSummary.empreendimento)}
                />
                <Summary
                  label="Corretor"
                  value={relationName(saleSummary.corretor)}
                />
                <Summary
                  label="Gerente"
                  value={relationName(saleSummary.gerente)}
                />
                <Summary
                  label="Data da venda"
                  value={formatDate(saleSummary.dataVenda)}
                />
                <Summary
                  label="VGV"
                  value={brl(numberValue(saleSummary.vgv))}
                />
              </div>
            </FormSection>
          )}

          <FormSection title="Recebimento">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="comissao-data-prevista">
                Data prevista de recebimento
              </Label>
              <Input
                id="comissao-data-prevista"
                type="date"
                value={form.dataPrevistaRecebimento}
                onChange={(event) =>
                  setField("dataPrevistaRecebimento", event.target.value)
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Nesta data as fatias entram em Contas a receber e no fluxo como
                previsão. Ao marcar como paga, o fluxo registra o recebimento.
              </p>
            </div>
          </FormSection>

          <FormSection title="Percentuais">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PercentField
                label="Imobiliária"
                value={form.percentualImobiliaria}
                onChange={(value) => setField("percentualImobiliaria", value)}
              />
              <PercentField
                label="Tributos"
                value={form.percentualTributos}
                onChange={(value) => setField("percentualTributos", value)}
              />
              <PercentField
                label="Corretor"
                value={form.percentualCorretor}
                onChange={(value) => setField("percentualCorretor", value)}
              />
              <PercentField
                label="Gerente"
                value={form.percentualGerente}
                onChange={(value) => setField("percentualGerente", value)}
              />
              <PercentField
                label="Caixa"
                value={form.percentualCaixa}
                onChange={(value) => setField("percentualCaixa", value)}
              />
              <PercentField
                label="Sócios"
                value={form.percentualSocios}
                onChange={(value) => setField("percentualSocios", value)}
              />
            </div>
            <p
              className={cn(
                "text-xs",
                Math.abs(splitTotal - 100) < 0.001
                  ? "text-emerald-600"
                  : "text-destructive",
              )}
            >
              Corretor + gerente + caixa + sócios:{" "}
              {splitTotal.toLocaleString("pt-BR")}% (deve somar 100%)
            </p>
            {mode === "edit" && (
              <div className="max-w-xs space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setField("status", value as ComissaoStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </FormSection>

          <FormSection title="Prévia do cálculo" className="bg-muted/20">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Summary label="Comissão bruta" value={brl(preview.gross)} />
              <Summary label="Tributos" value={brl(preview.taxes)} />
              <Summary
                label="Comissão líquida"
                value={brl(preview.net)}
                emphasized
              />
              <Summary label="Corretor" value={brl(preview.broker)} />
              <Summary label="Gerente" value={brl(preview.manager)} />
              <Summary label="Caixa" value={brl(preview.cash)} />
              <Summary label="Sócios" value={brl(preview.partners)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Bruta = VGV × % imobiliária; líquida = bruta − tributos;
              distribuição calculada sobre a líquida.
            </p>
          </FormSection>
        </FormDialogBody>
      </form>
    </FormDialogShell>
  );
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-8"
          required
        />
        <Percent className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "wrap-break-word",
          emphasized && "font-semibold text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
