import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { downloadContratoPdf } from "@/lib/contratos-pdf";
import {
  CONTRATO_TEMPLATES,
  emptyContratoForm,
  type ContratoField,
  type ContratoTemplate,
  type ContratoTemplateId,
} from "@/lib/contratos-templates";
import { formatPhone } from "@/lib/phone";
import { maskMoneyInput } from "@/lib/money-input";
import { formatCpfCnpj } from "@/lib/utils";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/contratos")({
  head: () => ({ meta: [{ title: "Contratos — Zone Connection" }] }),
  component: ContratosPage,
});

function maskField(field: ContratoField, raw: string) {
  if (field.type === "cpf" || field.type === "cnpj") {
    return formatCpfCnpj(raw);
  }
  if (field.type === "phone") return formatPhone(raw);
  if (field.type === "money") return maskMoneyInput(raw);
  return raw;
}

function ContratosPage() {
  const [selected, setSelected] = useState<ContratoTemplate | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const openTemplate = (template: ContratoTemplate) => {
    setSelected(template);
    setForm(emptyContratoForm(template));
  };

  const requiredMissing = useMemo(() => {
    if (!selected) return [];
    return selected.fields
      .filter((f) => f.required !== false && !(form[f.key] ?? "").trim())
      .map((f) => f.label);
  }, [form, selected]);

  function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (requiredMissing.length) {
      toast.error(`Preencha: ${requiredMissing.slice(0, 3).join(", ")}${requiredMissing.length > 3 ? "…" : ""}`);
      return;
    }
    setGenerating(true);
    try {
      downloadContratoPdf(selected.id as ContratoTemplateId, form);
      toast.success("PDF gerado e baixado.");
      setSelected(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível gerar o PDF.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Selecione o modelo, preencha os dados e baixe o PDF automaticamente."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CONTRATO_TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className="flex flex-col gap-3 p-4 border-border/60"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="text-sm font-semibold leading-snug">
                  {template.titulo}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {template.descricao}
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="mt-auto w-full"
              onClick={() => openTemplate(template)}
            >
              Preencher
            </Button>
          </Card>
        ))}
      </div>

      <FormDialogShell
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        icon={<FileText className="size-5" />}
        title={selected?.titulo ?? "Contrato"}
        description="Preencha os campos. O PDF será baixado ao gerar."
        className="max-w-2xl"
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={generating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="contrato-form"
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Download className="mr-1 size-4" />
              )}
              Gerar PDF
            </Button>
          </FormDialogActions>
        }
      >
        {selected && (
          <form
            id="contrato-form"
            onSubmit={handleGenerate}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <FormDialogBody>
              <FormSection title="Dados do documento">
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.fields.map((field) => (
                    <div
                      key={field.key}
                      className={
                        field.key === "endereco" ||
                        field.key === "descricaoImovel" ||
                        field.key === "contratanteEndereco" ||
                        field.key === "proprietarioEndereco"
                          ? "space-y-1.5 sm:col-span-2"
                          : "space-y-1.5"
                      }
                    >
                      <Label htmlFor={`contrato-${field.key}`}>
                        {field.label}
                        {field.required !== false ? " *" : ""}
                      </Label>
                      <Input
                        id={`contrato-${field.key}`}
                        type={field.type === "date" ? "date" : "text"}
                        inputMode={
                          field.type === "cpf" ||
                          field.type === "cnpj" ||
                          field.type === "phone" ||
                          field.type === "money"
                            ? "numeric"
                            : undefined
                        }
                        placeholder={field.placeholder}
                        value={form[field.key] ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [field.key]: maskField(field, e.target.value),
                          }))
                        }
                        required={field.required !== false}
                      />
                    </div>
                  ))}
                </div>
              </FormSection>
            </FormDialogBody>
          </form>
        )}
      </FormDialogShell>
    </div>
  );
}
