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
import { useTenantTheme } from "@/lib/tenant-theme";
import type { TenantBranding } from "@/lib/auth";
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

/** Prefill da CONTRATADA a partir do cadastro da imobiliária. */
function prefillFromTenant(
  template: ContratoTemplate,
  tenant: TenantBranding | null,
): Record<string, string> {
  const values = emptyContratoForm(template);
  if (!tenant || template.id !== "intermediacao") return values;

  if (tenant.name?.trim()) values.contratadaNome = tenant.name.trim();
  if (tenant.documento?.trim()) {
    values.contratadaCnpj = formatCpfCnpj(tenant.documento);
  }
  if (tenant.creci?.trim()) values.contratadaCreci = tenant.creci.trim();
  if (tenant.email?.trim()) values.contratadaEmail = tenant.email.trim();
  if (tenant.endereco?.trim()) {
    values.contratadaEndereco = tenant.endereco.trim();
  }
  if (tenant.cidade?.trim()) values.cidade = tenant.cidade.trim();
  return values;
}

function ContratoPreview({
  template,
  values,
  logoUrl,
}: {
  template: ContratoTemplate;
  values: Record<string, string>;
  logoUrl: string;
}) {
  const value = (key: string) => values[key]?.trim() || "----";
  const date = value("data") === "----" ? "____/____/________" : value("data");
  const content =
    template.id === "carta-cancelamento" ? (
      <>
        <p>
          Eu, <strong>{value("nome")}</strong>, portador do RG{" "}
          <strong>{value("rg")}</strong> e CPF <strong>{value("cpf")}</strong>,
          venho por meio desta informar que solicito o cancelamento da avaliação
          habitacional realizada em meu nome em uma construtora para dar
          continuidade em outra construtora.
        </p>
        <p>
          {value("cidade")}, {date}
        </p>
      </>
    ) : template.id === "parentesco-sem-conjuge" ? (
      <>
        <p>
          Eu, <strong>{value("nomeParente")}</strong>, CPF{" "}
          <strong>{value("cpfParente")}</strong>, estado civil{" "}
          <strong>{value("estadoCivil")}</strong>, declaro que sou{" "}
          <strong>{value("grauParentesco")}</strong> do proponente{" "}
          <strong>{value("nomeProponente")}</strong>, CPF{" "}
          <strong>{value("cpfProponente")}</strong>, com quem resido no mesmo
          endereço há pelo menos 6 (seis) meses.
        </p>
        <p>
          Declaro ainda que não possuo nenhum tipo de rendimento, seja renda
          formal ou informal, e que não participo como dependente de outro
          financiamento habitacional.
        </p>
        <p>Data: {date}</p>
      </>
    ) : template.id === "parentesco-com-conjuge" ? (
      <>
        <p>
          Eu, <strong>{value("nomeParente")}</strong>, CPF{" "}
          <strong>{value("cpfParente")}</strong>, declaro que sou{" "}
          <strong>{value("grauParentesco")}</strong> do proponente{" "}
          <strong>{value("nomeProponente")}</strong>, CPF{" "}
          <strong>{value("cpfProponente")}</strong>, com quem resido no endereço{" "}
          <strong>{value("endereco")}</strong>.
        </p>
        <p>
          Eu, <strong>{value("nomeConjuge")}</strong>, declaro que também não
          possuo nenhum tipo de rendimento, seja renda formal ou informal.
        </p>
        <p>Data: {date}</p>
      </>
    ) : (
      <>
        <p>
          Contratante: <strong>{value("contratanteNome")}</strong>, CPF{" "}
          <strong>{value("contratanteCpf")}</strong>.
        </p>
        <p>
          Proprietário: <strong>{value("proprietarioNome")}</strong>.
        </p>
        <p>
          Imóvel: <strong>{value("empreendimento")}</strong>, unidade{" "}
          <strong>{value("unidade")}</strong>.
        </p>
      </>
    );

  return (
    <aside className="sticky top-3 self-start rounded-xl border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <div>
          <div className="text-sm font-semibold">Prévia do documento</div>
          <div className="text-xs text-muted-foreground">
            Atualizada enquanto você preenche
          </div>
        </div>
        <FileText className="size-4 text-muted-foreground" />
      </div>
      <div className="aspect-[210/297] min-h-[480px] overflow-y-auto rounded border bg-card p-6 text-foreground">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="mx-auto mb-5 h-12 max-w-36 object-contain"
          />
        ) : null}
        <h3 className="text-center text-sm font-bold uppercase leading-snug">
          {template.titulo}
        </h3>
        <div className="my-4 border-t" />
        <div className="space-y-4 text-xs leading-relaxed text-justify">
          {content}
          <div className="mt-10 space-y-10 text-center text-[10px]">
            <div className="mx-auto w-40 border-t pt-1">ASSINATURA</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ContratosPage() {
  const { logoUrl, tenant } = useTenantTheme();
  const [selected, setSelected] = useState<ContratoTemplate | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const openTemplate = (template: ContratoTemplate) => {
    setSelected(template);
    setForm(prefillFromTenant(template, tenant));
  };

  const requiredMissing = useMemo(() => {
    if (!selected) return [];
    return selected.fields
      .filter((f) => f.required !== false && !(form[f.key] ?? "").trim())
      .map((f) => f.label);
  }, [form, selected]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (requiredMissing.length) {
      toast.error(
        `Preencha: ${requiredMissing.slice(0, 3).join(", ")}${requiredMissing.length > 3 ? "…" : ""}`,
      );
      return;
    }
    setGenerating(true);
    try {
      await downloadContratoPdf(selected.id as ContratoTemplateId, form, {
        logoUrl,
        primaryColor: tenant?.primaryColor,
      });
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
        className="max-w-6xl"
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
            <Button type="submit" form="contrato-form" disabled={generating}>
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
            <FormDialogBody className="lg:grid lg:grid-cols-[minmax(22rem,0.85fr)_minmax(28rem,1.15fr)] lg:items-start lg:gap-5 lg:space-y-0">
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
              <div className="hidden lg:block">
                <ContratoPreview
                  template={selected}
                  values={form}
                  logoUrl={logoUrl}
                />
              </div>
            </FormDialogBody>
          </form>
        )}
      </FormDialogShell>
    </div>
  );
}
