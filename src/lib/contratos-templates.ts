export type ContratoFieldType = "text" | "cpf" | "cnpj" | "phone" | "date" | "money";

export type ContratoField = {
  key: string;
  label: string;
  type: ContratoFieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
};

export type ContratoTemplateId =
  | "carta-cancelamento"
  | "parentesco-sem-conjuge"
  | "parentesco-com-conjuge"
  | "intermediacao";

export type ContratoTemplate = {
  id: ContratoTemplateId;
  titulo: string;
  descricao: string;
  fields: ContratoField[];
};

export const CONTRATO_TEMPLATES: ContratoTemplate[] = [
  {
    id: "carta-cancelamento",
    titulo: "Carta de cancelamento",
    descricao:
      "Solicitação de cancelamento de avaliação habitacional em construtora.",
    fields: [
      { key: "nome", label: "Nome completo", type: "text", required: true },
      { key: "rg", label: "RG", type: "text", required: true, placeholder: "0000000" },
      { key: "cpf", label: "CPF", type: "cpf", required: true },
      {
        key: "cidade",
        label: "Cidade",
        type: "text",
        required: true,
        defaultValue: "Paulista",
      },
      { key: "dia", label: "Dia", type: "text", required: true, placeholder: "07" },
      {
        key: "mes",
        label: "Mês (por extenso)",
        type: "text",
        required: true,
        placeholder: "agosto",
      },
      {
        key: "ano",
        label: "Ano (2 dígitos)",
        type: "text",
        required: true,
        placeholder: "26",
      },
    ],
  },
  {
    id: "parentesco-sem-conjuge",
    titulo: "Declaração de parentesco (sem cônjuge)",
    descricao:
      "Parenteco, residência e ausência de rendimentos — sem cônjuge do parente.",
    fields: [
      {
        key: "nomeParente",
        label: "Nome do parente",
        type: "text",
        required: true,
      },
      { key: "cpfParente", label: "CPF do parente", type: "cpf", required: true },
      {
        key: "estadoCivil",
        label: "Estado civil do parente",
        type: "text",
        required: true,
        placeholder: "solteiro(a)",
      },
      {
        key: "grauParentesco",
        label: "Grau de parentesco",
        type: "text",
        required: true,
        placeholder: "filho(a), mãe, pai…",
      },
      {
        key: "nomeProponente",
        label: "Nome do proponente",
        type: "text",
        required: true,
      },
      {
        key: "cpfProponente",
        label: "CPF do proponente",
        type: "cpf",
        required: true,
      },
      { key: "data", label: "Data", type: "date", required: true },
    ],
  },
  {
    id: "parentesco-com-conjuge",
    titulo: "Declaração de parentesco (com cônjuge)",
    descricao:
      "Parenteco, residência e ausência de rendimentos — com cônjuge do parente.",
    fields: [
      {
        key: "nomeParente",
        label: "Nome do parente",
        type: "text",
        required: true,
      },
      { key: "cpfParente", label: "CPF do parente", type: "cpf", required: true },
      {
        key: "estadoCivil",
        label: "Estado civil do parente",
        type: "text",
        required: true,
      },
      {
        key: "grauParentesco",
        label: "Grau de parentesco",
        type: "text",
        required: true,
      },
      {
        key: "nomeProponente",
        label: "Nome do proponente",
        type: "text",
        required: true,
      },
      {
        key: "cpfProponente",
        label: "CPF do proponente",
        type: "cpf",
        required: true,
      },
      {
        key: "endereco",
        label: "Endereço residencial compartilhado",
        type: "text",
        required: true,
      },
      {
        key: "nomeConjuge",
        label: "Nome do cônjuge/companheiro do parente",
        type: "text",
        required: true,
      },
      { key: "data", label: "Data", type: "date", required: true },
    ],
  },
  {
    id: "intermediacao",
    titulo: "Contrato de intermediação",
    descricao:
      "Intermediação para compra/venda de imóvel entre contratante e imobiliária.",
    fields: [
      {
        key: "contratanteNome",
        label: "Contratante — nome",
        type: "text",
        required: true,
      },
      {
        key: "contratanteCpf",
        label: "Contratante — CPF",
        type: "cpf",
        required: true,
      },
      {
        key: "contratanteRg",
        label: "Contratante — RG",
        type: "text",
        required: true,
      },
      {
        key: "contratanteTel",
        label: "Contratante — telefone",
        type: "phone",
        required: true,
      },
      {
        key: "contratanteEmail",
        label: "Contratante — e-mail",
        type: "text",
        required: true,
      },
      {
        key: "contratanteEndereco",
        label: "Contratante — endereço",
        type: "text",
        required: true,
      },
      {
        key: "contratanteCep",
        label: "Contratante — CEP",
        type: "text",
        required: true,
      },
      {
        key: "proprietarioNome",
        label: "Proprietário — nome/razão social",
        type: "text",
        required: true,
      },
      {
        key: "proprietarioCnpj",
        label: "Proprietário — CNPJ/CPF",
        type: "cnpj",
        required: true,
      },
      {
        key: "proprietarioEndereco",
        label: "Proprietário — endereço",
        type: "text",
        required: true,
      },
      {
        key: "proprietarioTel",
        label: "Proprietário — telefone",
        type: "phone",
        required: true,
      },
      {
        key: "construtora",
        label: "Construtora",
        type: "text",
        required: true,
      },
      {
        key: "empreendimento",
        label: "Empreendimento",
        type: "text",
        required: true,
      },
      {
        key: "unidade",
        label: "Unidade (bloco/apto)",
        type: "text",
        required: true,
      },
      { key: "andar", label: "Andar", type: "text", required: true },
      {
        key: "descricaoImovel",
        label: "Descrição do imóvel",
        type: "text",
        required: true,
      },
      {
        key: "precoImovel",
        label: "Preço do imóvel (R$)",
        type: "money",
        required: true,
      },
      {
        key: "valorIntermediacao",
        label: "Valor da intermediação (R$)",
        type: "money",
        required: true,
      },
      {
        key: "valorIntermediacaoExtenso",
        label: "Valor da intermediação por extenso",
        type: "text",
        required: true,
        placeholder: "Dois Mil Reais",
      },
      {
        key: "banco",
        label: "Banco (pagamento)",
        type: "text",
        required: true,
        defaultValue: "Inter",
      },
      {
        key: "agencia",
        label: "Agência",
        type: "text",
        required: true,
        defaultValue: "0001-9",
      },
      {
        key: "conta",
        label: "Conta",
        type: "text",
        required: true,
        defaultValue: "1902391-0",
      },
      {
        key: "pix",
        label: "PIX",
        type: "text",
        required: true,
      },
      {
        key: "representanteLegal",
        label: "Representante legal (conta)",
        type: "text",
        required: true,
      },
      {
        key: "contratadaNome",
        label: "Contratada (imobiliária)",
        type: "text",
        required: true,
        defaultValue: "NEW PALACE IMOBILIÁRIA",
      },
      {
        key: "contratadaCnpj",
        label: "Contratada — CNPJ",
        type: "cnpj",
        required: true,
      },
      {
        key: "cidade",
        label: "Cidade do contrato",
        type: "text",
        required: true,
        defaultValue: "Recife/PE",
      },
      { key: "data", label: "Data", type: "date", required: true },
      {
        key: "testemunha1Nome",
        label: "Testemunha 1 — nome",
        type: "text",
        required: false,
      },
      {
        key: "testemunha1Cpf",
        label: "Testemunha 1 — CPF",
        type: "cpf",
        required: false,
      },
      {
        key: "testemunha2Nome",
        label: "Testemunha 2 — nome",
        type: "text",
        required: false,
      },
      {
        key: "testemunha2Cpf",
        label: "Testemunha 2 — CPF",
        type: "cpf",
        required: false,
      },
    ],
  },
];

export function getContratoTemplate(id: ContratoTemplateId) {
  return CONTRATO_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function emptyContratoForm(template: ContratoTemplate) {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.key] = field.defaultValue ?? "";
  }
  return values;
}
