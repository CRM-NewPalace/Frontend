import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { downloadContratoPdf, resolveContratoBrandHex } from "@/lib/contratos-pdf";
import {
  CONTRATO_TEMPLATES,
  emptyContratoForm,
  type ContratoField,
  type ContratoTemplate,
  type ContratoTemplateId,
} from "@/lib/contratos-templates";
import { formatPhone } from "@/lib/phone";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money-input";
import { reaisPorExtenso } from "@/lib/valor-extenso";
import { formatCpfCnpj } from "@/lib/utils";
import { useTenantTheme } from "@/lib/tenant-theme";
import type { TenantBranding } from "@/lib/auth";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const INTERMEDIACAO_SECTIONS = [
  {
    id: "contratante",
    label: "Contratante",
    keys: [
      "contratanteNome",
      "contratanteCpf",
      "contratanteRg",
      "contratanteTel",
      "contratanteEmail",
      "contratanteEndereco",
      "contratanteCep",
    ],
  },
  {
    id: "proprietario",
    label: "Proprietário",
    keys: [
      "proprietarioNome",
      "proprietarioCnpj",
      "proprietarioEndereco",
      "proprietarioTel",
    ],
  },
  {
    id: "imovel",
    label: "Imóvel",
    keys: [
      "construtora",
      "empreendimento",
      "unidade",
      "andar",
      "descricaoImovel",
      "precoImovel",
    ],
  },
  {
    id: "pagamento",
    label: "Pagamento",
    keys: [
      "valorIntermediacao",
      "valorIntermediacaoExtenso",
      "banco",
      "agencia",
      "conta",
      "pix",
      "representanteLegal",
    ],
  },
  {
    id: "imobiliaria",
    label: "Imobiliária",
    keys: [
      "contratadaNome",
      "contratadaCnpj",
      "contratadaCreci",
      "contratadaEmail",
      "contratadaEndereco",
      "cidade",
      "data",
    ],
  },
  {
    id: "testemunhas",
    label: "Testemunhas",
    keys: [
      "testemunha1Nome",
      "testemunha1Cpf",
      "testemunha2Nome",
      "testemunha2Cpf",
    ],
  },
] as const;

type IntermediacaoSectionId = (typeof INTERMEDIACAO_SECTIONS)[number]["id"];

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
  if (!tenant) return values;

  if (template.id === "intermediacao") {
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
  }

  if (template.id === "checklist-renda-informal" && tenant.cidade?.trim()) {
    values.cidade = tenant.cidade.trim();
  }

  if (template.id === "recibo-pagamento") {
    if (tenant.name?.trim()) values.empresaNome = tenant.name.trim();
    if (tenant.telefone?.trim()) {
      values.empresaTelefone = formatPhone(tenant.telefone);
    }
    if (tenant.cidade?.trim()) values.cidade = tenant.cidade.trim();
  }

  return values;
}

function brandHex(color?: string | null) {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#079ED4";
}

function PreviewSection({
  title,
  color,
}: {
  title: string;
  color: string;
}) {
  return (
    <div
      className="border-b pb-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ color, borderColor: color }}
    >
      {title}
    </div>
  );
}

function PreviewMark({
  checked,
  label,
  color,
}: {
  checked: boolean;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-snug">
      <span
        className="mt-0.5 inline-block size-3 shrink-0 rounded-[2px] border"
        style={{
          borderColor: color,
          backgroundColor: checked ? color : "transparent",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function formatLongDatePt(iso: string) {
  if (!iso) return "____ de ________ de ________";
  const [year, month, day] = iso.slice(0, 10).split("-");
  const monthIndex = Number(month) - 1;
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  if (!year || !day || !Number.isInteger(monthIndex) || !months[monthIndex]) {
    return iso;
  }
  return `${Number(day)} de ${months[monthIndex]} de ${year}`;
}

function moneyPreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "R$ 0,00";
  return trimmed.startsWith("R$") ? trimmed : `R$ ${trimmed}`;
}

function ContratoPreview({
  template,
  values,
  logoUrl,
  primaryColor,
}: {
  template: ContratoTemplate;
  values: Record<string, string>;
  logoUrl: string;
  primaryColor?: string | null;
}) {
  const value = (key: string) => values[key]?.trim() || "----";
  const date = value("data") === "----" ? "____/____/________" : value("data");
  const accent = brandHex(primaryColor);
  const checked = (key: string) => values[key] === "true";
  const yes = (key: string) => values[key] === "sim";
  const no = (key: string) => values[key] === "nao";

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
    ) : template.id === "checklist-renda-informal" ? (
      <div className="space-y-3 text-left not-italic">
        <PreviewSection title="Dados do cliente" color="#111111" />
        <p>
          Nome: <strong>{value("nome")}</strong>
        </p>
        <p>
          CPF: <strong>{value("cpf")}</strong>
        </p>
        <p>
          Renda solicitada: <strong>{value("rendaSolicitada")}</strong>
        </p>
        <p>
          Profissão: <strong>{value("profissao")}</strong>
        </p>
        <p>
          Renda nos extratos: <strong>{value("rendaParcialExtratos")}</strong>
        </p>
        <div className="flex flex-wrap gap-4">
          <PreviewMark
            checked={yes("bolsaFamilia")}
            label="Bolsa Família: Sim"
            color={accent}
          />
          <PreviewMark
            checked={no("bolsaFamilia")}
            label="Não"
            color={accent}
          />
        </div>
        <p>
          Valor Bolsa Família: <strong>{value("bolsaFamiliaValor")}</strong>
        </p>
        <PreviewSection title="Renda mista" color="#111111" />
        <div className="flex flex-wrap gap-4">
          <PreviewMark
            checked={yes("vinculoEmpregaticio")}
            label="Vínculo: Sim"
            color={accent}
          />
          <PreviewMark
            checked={no("vinculoEmpregaticio")}
            label="Não"
            color={accent}
          />
        </div>
        <p>
          Empresa: <strong>{value("empresa")}</strong>
        </p>
        <p>
          Salário: <strong>{value("salarioContracheque")}</strong>
        </p>
        <PreviewSection title="Documentação anexada" color="#111111" />
        <PreviewMark
          checked={checked("docExtratos")}
          label="Extratos bancários (6 meses)"
          color={accent}
        />
        <PreviewMark
          checked={checked("docContracheques")}
          label="Contracheques (renda mista)"
          color={accent}
        />
        <PreviewMark
          checked={checked("docFgts")}
          label="Extrato do FGTS do mesmo mês"
          color={accent}
        />
        <PreviewMark
          checked={checked("docIdentidade")}
          label="Documento de identificação"
          color={accent}
        />
        <PreviewMark
          checked={checked("docOutros")}
          label={`Outros${values.docOutrosTexto?.trim() ? `: ${values.docOutrosTexto.trim()}` : ""}`}
          color={accent}
        />
        <PreviewSection title="Observações" color="#111111" />
        <p className="whitespace-pre-wrap min-h-10">
          {values.observacoes?.trim() || "—"}
        </p>
        <p>
          {value("cidade")}, {date}
        </p>
      </div>
    ) : template.id === "recibo-pagamento" ? (
      <div className="rounded-2xl border border-foreground/80 p-4 text-left not-italic">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h3 className="pt-1.5 text-base font-bold leading-tight">
            Recibo de Pagamento
          </h3>
          <div className="shrink-0 rounded-md border border-foreground/80 px-3 py-1.5 text-sm font-bold">
            {moneyPreview(values.valor ?? "")}
          </div>
        </div>
        <p className="text-justify">
          Recebi(emos) de <strong>{value("pagadorNome")}</strong> - CPF{" "}
          <strong>{value("pagadorCpf")}</strong>, a importância de{" "}
          <strong>{value("valorExtenso")}</strong>, referente à{" "}
          <strong>{value("referente")}</strong>.
        </p>
        <p className="mt-4 text-justify">
          Para maior clareza, firmo(amos) o presente recibo, que comprova o
          recebimento integral do valor mencionado, concedendo{" "}
          <strong>quitação plena, geral e irrevogável</strong> pela quantia
          recebida.
        </p>
        <p className="mt-6 text-right font-semibold">
          {value("cidade")},{" "}
          {values.data?.trim()
            ? formatLongDatePt(values.data)
            : "____ de ________ de ________"}
        </p>
        <div className="mt-12 space-y-1 text-center text-[11px]">
          <div className="mx-auto w-48 border-t border-foreground/70" />
          <div className="pt-2 font-bold uppercase">
            {value("empresaNome")}
          </div>
          {values.empresaTelefone?.trim() ? (
            <div>{values.empresaTelefone.trim()}</div>
          ) : null}
        </div>
      </div>
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
      <div
        className="aspect-210/297 min-h-120 overflow-y-auto rounded border-2 bg-card p-6 text-foreground"
        style={{ borderColor: accent }}
      >
        {template.id === "recibo-pagamento" ? (
          <div className="text-xs leading-relaxed">{content}</div>
        ) : (
          <>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="mx-auto mb-5 h-12 max-w-36 object-contain"
              />
            ) : null}
            <h3
              className="text-center text-sm font-bold uppercase leading-snug"
              style={{ color: accent }}
            >
              {template.titulo}
            </h3>
            <div className="my-4 border-t" style={{ borderColor: accent }} />
            <div className="space-y-4 text-xs leading-relaxed text-justify">
              {content}
              <div className="mt-10 space-y-10 text-center text-[10px]">
                <div
                  className="mx-auto w-40 border-t pt-1"
                  style={{ borderColor: accent }}
                >
                  ASSINATURA
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function ContratosPage() {
  const { logoUrl, tenant } = useTenantTheme();
  const [logoColor, setLogoColor] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContratoTemplate | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [intermediacaoSection, setIntermediacaoSection] =
    useState<IntermediacaoSectionId>("contratante");

  useEffect(() => {
    let cancelled = false;
    void resolveContratoBrandHex(logoUrl, tenant?.primaryColor).then((hex) => {
      if (!cancelled) setLogoColor(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl, tenant?.primaryColor]);

  const openTemplate = (template: ContratoTemplate) => {
    setSelected(template);
    setForm(prefillFromTenant(template, tenant));
    setIntermediacaoSection("contratante");
  };

  const requiredMissing = useMemo(() => {
    if (!selected) return [];
    return selected.fields
      .filter((f) => f.required !== false && !(form[f.key] ?? "").trim())
      .map((f) => f.label);
  }, [form, selected]);
  const formFields = useMemo(() => {
    if (!selected) return [];
    if (selected.id !== "intermediacao") return selected.fields;
    const section = INTERMEDIACAO_SECTIONS.find(
      (item) => item.id === intermediacaoSection,
    );
    return selected.fields.filter((field) => section?.keys.includes(field.key));
  }, [intermediacaoSection, selected]);

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
        primaryColor: logoColor ?? tenant?.primaryColor,
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              size="sm"
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
        className={selected?.id === "intermediacao" ? "max-w-3xl" : "max-w-6xl"}
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
            <FormDialogBody
              className={
                selected.id === "intermediacao"
                  ? ""
                  : "lg:grid lg:grid-cols-[minmax(22rem,0.85fr)_minmax(28rem,1.15fr)] lg:items-start lg:gap-5 lg:space-y-0"
              }
            >
              {selected.id === "intermediacao" ? (
                <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-2 sm:grid-cols-3">
                  {INTERMEDIACAO_SECTIONS.map((section) => (
                    <Button
                      key={section.id}
                      type="button"
                      size="sm"
                      variant={
                        intermediacaoSection === section.id
                          ? "default"
                          : "ghost"
                      }
                      onClick={() => setIntermediacaoSection(section.id)}
                    >
                      {section.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              <FormSection title="Dados do documento">
                <div className="grid gap-3 sm:grid-cols-2">
                  {formFields.map((field) => {
                    const wide =
                      field.type === "textarea" ||
                      field.type === "check" ||
                      field.key === "endereco" ||
                      field.key === "descricaoImovel" ||
                      field.key === "contratanteEndereco" ||
                      field.key === "proprietarioEndereco" ||
                      field.key === "observacoes" ||
                      field.key === "referente";
                    return (
                      <div
                        key={field.key}
                        className={
                          wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"
                        }
                      >
                        {field.type === "check" ? (
                          <label
                            htmlFor={`contrato-${field.key}`}
                            className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
                          >
                            <Checkbox
                              id={`contrato-${field.key}`}
                              checked={form[field.key] === "true"}
                              onCheckedChange={(value) =>
                                setForm((prev) => ({
                                  ...prev,
                                  [field.key]: value === true ? "true" : "",
                                }))
                              }
                            />
                            <span className="text-sm">{field.label}</span>
                          </label>
                        ) : field.type === "yesno" ? (
                          <>
                            <Label>
                              {field.label}
                              {field.required !== false ? " *" : ""}
                            </Label>
                            <div className="flex gap-2">
                              {(["sim", "nao"] as const).map((option) => (
                                <Button
                                  key={option}
                                  type="button"
                                  size="sm"
                                  variant={
                                    form[field.key] === option
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      [field.key]: option,
                                    }))
                                  }
                                >
                                  {option === "sim" ? "Sim" : "Não"}
                                </Button>
                              ))}
                            </div>
                          </>
                        ) : field.type === "textarea" ? (
                          <>
                            <Label htmlFor={`contrato-${field.key}`}>
                              {field.label}
                            </Label>
                            <Textarea
                              id={`contrato-${field.key}`}
                              value={form[field.key] ?? ""}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </>
                        ) : (
                          <>
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
                                setForm((prev) => {
                                  const next = maskField(
                                    field,
                                    e.target.value,
                                  );
                                  const updated = {
                                    ...prev,
                                    [field.key]: next,
                                  };
                                  if (field.key === "valor") {
                                    const amount = parseMoneyInput(next);
                                    updated.valorExtenso =
                                      Number.isFinite(amount) && amount > 0
                                        ? reaisPorExtenso(amount)
                                        : "";
                                  }
                                  return updated;
                                })
                              }
                              required={field.required !== false}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </FormSection>
              {selected.id !== "intermediacao" ? (
                <div className="hidden lg:block">
                  <ContratoPreview
                    template={selected}
                    values={form}
                    logoUrl={logoUrl}
                    primaryColor={logoColor ?? tenant?.primaryColor}
                  />
                </div>
              ) : null}
            </FormDialogBody>
          </form>
        )}
      </FormDialogShell>
    </div>
  );
}
