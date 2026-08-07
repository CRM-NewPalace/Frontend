import { jsPDF } from "jspdf";
import type { ContratoTemplateId } from "@/lib/contratos-templates";

type Values = Record<string, string>;

function v(values: Values, key: string) {
  return (values[key] ?? "").trim() || "____________";
}

function formatDateBr(iso: string) {
  if (!iso) return "____/____/________";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function safeName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 40);
}

function writeTitle(doc: jsPDF, title: string, y: number) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  const lines = doc.splitTextToSize(title, pageW - 96);
  doc.text(lines, pageW / 2, y, { align: "center" });
  return y + lines.length * 16 + 10;
}

function ensureSpace(doc: jsPDF, y: number, need: number) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 48) {
    doc.addPage();
    return 48;
  }
  return y;
}

/** Texto com trechos em negrito intercalados: ["normal ", {b:"valor"}, " resto"] */
function writeRich(
  doc: jsPDF,
  parts: Array<string | { b: string }>,
  startY: number,
  opts?: { fontSize?: number; lineH?: number },
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxW = pageW - margin * 2;
  const fontSize = opts?.fontSize ?? 10;
  const lineH = opts?.lineH ?? 14;
  let y = startY;
  let x = margin;

  doc.setFontSize(fontSize);
  doc.setTextColor(30, 30, 30);

  const tokens: Array<{ text: string; bold: boolean }> = [];
  for (const part of parts) {
    if (typeof part === "string") {
      for (const word of part.split(/(\s+)/)) {
        if (!word) continue;
        tokens.push({ text: word, bold: false });
      }
    } else {
      tokens.push({ text: part.b, bold: true });
    }
  }

  for (const token of tokens) {
    doc.setFont("helvetica", token.bold ? "bold" : "normal");
    const w = doc.getTextWidth(token.text);
    if (x + w > margin + maxW && !/^\s+$/.test(token.text)) {
      y += lineH;
      y = ensureSpace(doc, y, lineH);
      x = margin;
    }
    if (y === 48 && /^\s+$/.test(token.text)) continue;
    doc.text(token.text, x, y);
    x += w;
  }

  return y + lineH + 4;
}

function writeParagraph(doc: jsPDF, text: string, y: number, bold = false) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(text, pageW - margin * 2);
  for (const line of lines) {
    y = ensureSpace(doc, y, 14);
    doc.text(line, margin, y);
    y += 14;
  }
  return y + 6;
}

function writeSignature(
  doc: jsPDF,
  y: number,
  label: string,
  name?: string,
  extra?: string,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  y = ensureSpace(doc, y, 56);
  y += 10;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.6);
  const lineW = Math.min(260, pageW - margin * 2);
  doc.line(margin, y, margin + lineW, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(label, margin, y);
  y += 12;
  if (name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(name, margin, y);
    y += 11;
  }
  if (extra) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(extra, margin, y);
    y += 11;
  }
  return y + 8;
}

function pdfCartaCancelamento(values: Values) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 72;
  y = writeTitle(doc, "CARTA DE CANCELAMENTO", y);
  y += 12;

  y = writeRich(doc, [
    "EU, ",
    { b: v(values, "nome").toUpperCase() },
    ", PORTADOR DO RG: ",
    { b: v(values, "rg") },
    " SDS/PE E CPF: ",
    { b: v(values, "cpf") },
    ", VENHO POR MEIO DESTA INFORMAR QUE SOLICITO O CANCELAMENTO DA AVALIAÇÃO HABITACIONAL, REALIZADA EM MEU NOME EM UMA CONSTRUTORA PARA DAR CONTINUIDADE EM OUTRA CONSTRUTORA.",
  ], y, { fontSize: 11, lineH: 16 });

  y += 24;
  y = writeParagraph(
    doc,
    `${v(values, "cidade").toUpperCase()}, ${v(values, "dia")} DE ${v(values, "mes").toUpperCase()} DE 20${v(values, "ano")}`,
  );

  y = writeSignature(doc, y + 40, "ASSINATURA");
  doc.save(`carta-cancelamento-${safeName(v(values, "nome"))}.pdf`);
}

function pdfParentescoSem(values: Values) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 56;
  y = writeTitle(
    doc,
    "DECLARAÇÃO DE PARENTESCO, RESIDÊNCIA E AUSÊNCIA DE RENDIMENTOS",
    y,
  );

  y = writeRich(doc, [
    "Eu, ",
    { b: v(values, "nomeParente") },
    ", CPF ",
    { b: v(values, "cpfParente") },
    ", estado civil ",
    { b: v(values, "estadoCivil") },
    ", declaro que sou ",
    { b: v(values, "grauParentesco") },
    " do proponente ",
    { b: v(values, "nomeProponente") },
    ", CPF ",
    { b: v(values, "cpfProponente") },
    ", com quem resido no mesmo endereço há pelo menos 6 (seis) meses.",
  ], y);

  y = writeParagraph(
    doc,
    "Declaro ainda que não possuo nenhum tipo de rendimento, seja renda formal ou informal exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023 e dependo financeiramente do " +
      v(values, "nomeProponente") +
      ", proponente acima qualificado.",
  );

  y = writeParagraph(
    doc,
    "Declaro ainda que não participo como dependente de nenhum outro contrato de financiamento habitacional e não possuo financiamento ativo no SFH.",
  );

  y = writeParagraph(doc, "RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS", true);
  y = writeParagraph(
    doc,
    "Responsabilizo-me pela exatidão e veracidade das informações declaradas e estou ciente de que, se falsas as declarações, ficarei sujeito às penas da lei, ficando, ainda, obrigado(a) a devolver os valores indevidamente sacados da conta vinculada do FGTS e/ou descontos concedidos pelo FGTS nos termos da Resolução do Conselho Curador do FGTS 702/12, suas alterações e aditamentos, acrescidos de correção monetária e juros sem prejuízo do vencimento antecipado da dívida decorrente do crédito concedido, com a consequente cobrança administrativa/judicial.",
  );

  y = writeParagraph(doc, `Data: ${formatDateBr(values.data)}`);
  y = writeSignature(doc, y, "Assinatura do parente", v(values, "nomeParente"));
  y = writeSignature(doc, y, "Assinatura do proponente", v(values, "nomeProponente"));

  doc.save(`parentesco-sem-conjuge-${safeName(v(values, "nomeParente"))}.pdf`);
}

function pdfParentescoCom(values: Values) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 56;
  y = writeTitle(
    doc,
    "DECLARAÇÃO DE PARENTESCO, RESIDÊNCIA E AUSÊNCIA DE RENDIMENTOS",
    y,
  );

  y = writeRich(doc, [
    "Eu, ",
    { b: v(values, "nomeParente") },
    ", CPF ",
    { b: v(values, "cpfParente") },
    ", estado civil ",
    { b: v(values, "estadoCivil") },
    ", declaro, sob as penas da Lei n.º 7.115/1983, que sou ",
    { b: v(values, "grauParentesco") },
    " do proponente ",
    { b: v(values, "nomeProponente") },
    ", CPF ",
    { b: v(values, "cpfProponente") },
    ", com quem resido no ",
    { b: v(values, "endereco") },
    " há pelo menos 6 (seis) meses.",
  ], y);

  y = writeParagraph(
    doc,
    "Declaro ainda que não possuo nenhum tipo de rendimento, seja renda formal ou informal exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023 e dependo financeiramente do " +
      v(values, "nomeProponente") +
      ", proponente acima qualificado. Declaro ainda que não participo como dependente de nenhum outro contrato de financiamento habitacional e não possuo financiamento ativo no SFH.",
  );

  y = writeRich(doc, [
    "Eu, ",
    { b: v(values, "nomeConjuge") },
    ", declaro que também não possuo nenhum tipo de rendimento, seja renda formal ou informal, exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023.",
  ], y);

  y = writeParagraph(doc, "RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS", true);
  y = writeParagraph(
    doc,
    "Responsabilizo-me pela exatidão e veracidade das informações declaradas e estou ciente de que, se falsas as declarações, ficarei sujeito às penas da lei, ficando, ainda, obrigado(a) a devolver os valores indevidamente sacados da conta vinculada do FGTS e/ou descontos concedidos pelo FGTS nos termos da Resolução do Conselho Curador do FGTS 702/12, suas alterações e aditamentos, acrescidos de correção monetária e juros sem prejuízo do vencimento antecipado da dívida decorrente do crédito concedido, com a consequente cobrança administrativa/judicial.",
  );

  y = writeParagraph(doc, `Data: ${formatDateBr(values.data)}`);
  y = writeSignature(doc, y, "Assinatura do parente", v(values, "nomeParente"));
  y = writeSignature(doc, y, "Assinatura do cônjuge do parente", v(values, "nomeConjuge"));
  y = writeSignature(doc, y, "Assinatura do proponente", v(values, "nomeProponente"));

  doc.save(`parentesco-com-conjuge-${safeName(v(values, "nomeParente"))}.pdf`);
}

function pdfIntermediacao(values: Values) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 48;
  y = writeTitle(
    doc,
    "CONTRATO DE INTERMEDIAÇÃO PARA COMPRA/VENDA DE IMÓVEL",
    y,
  );

  y = writeParagraph(
    doc,
    "Por este instrumento particular, as partes qualificadas na Cláusula 1ª resolvem, por livre e espontânea vontade, firmar o presente contrato de intermediação para fins de compra/venda de imóvel conforme os termos e condições estabelecidos nas cláusulas seguintes:",
  );

  y = writeParagraph(doc, "CLÁUSULA 1ª – DAS PARTES", true);
  y = writeParagraph(doc, "Denominado de CONTRATANTE(s):", true);
  y = writeParagraph(doc, `Nome: ${v(values, "contratanteNome")}`);
  y = writeParagraph(doc, `CPF: ${v(values, "contratanteCpf")}    RG: ${v(values, "contratanteRg")}`);
  y = writeParagraph(doc, `Tel.: ${v(values, "contratanteTel")}`);
  y = writeParagraph(doc, `E-mail: ${v(values, "contratanteEmail")}`);
  y = writeParagraph(
    doc,
    `Endereço: ${v(values, "contratanteEndereco")}    CEP: ${v(values, "contratanteCep")}`,
  );

  y = writeParagraph(doc, "Denominado PROPRIETÁRIO:", true);
  y = writeParagraph(doc, `Nome: ${v(values, "proprietarioNome")}`);
  y = writeParagraph(doc, `CNPJ/CPF: ${v(values, "proprietarioCnpj")}`);
  y = writeParagraph(doc, `Endereço: ${v(values, "proprietarioEndereco")}`);
  y = writeParagraph(doc, `Tel.: ${v(values, "proprietarioTel")}`);

  y = writeParagraph(doc, "CLÁUSULA 2ª – OBJETO DO CONTRATO", true);
  y = writeParagraph(
    doc,
    "O presente contrato tem por finalidade a contratação dos serviços profissionais de corretagem da CONTRATADA pelo CONTRATANTE, nos moldes do artigo 726 do Código Civil, e será considerado concluído, quando da assinatura do contrato de promessa de compra e venda entre o CONTRATANTE e o PROPRIETÁRIO do imóvel comercializado.",
  );
  y = writeParagraph(doc, `Construtora: ${v(values, "construtora")}`);
  y = writeParagraph(doc, `Empreendimento: ${v(values, "empreendimento")}`);
  y = writeParagraph(doc, `Unidade: ${v(values, "unidade")}`);
  y = writeParagraph(doc, `Andar: ${v(values, "andar")}`);
  y = writeParagraph(doc, `Descrição do Imóvel: ${v(values, "descricaoImovel")}`);
  y = writeParagraph(doc, `Preço do Imóvel: R$ ${v(values, "precoImovel")}`);
  y = writeParagraph(
    doc,
    `Valor da intermediação: R$ ${v(values, "valorIntermediacao")}`,
  );

  y = writeParagraph(doc, "CLÁUSULA 3ª – HONORÁRIOS DE CORRETAGEM – DO PAGAMENTO", true);
  y = writeParagraph(
    doc,
    `3.1 Para pagamento dos serviços de intermediação, o CONTRATANTE pagará à CONTRATADA, a título de honorários de corretagem, o valor de R$ ${v(values, "valorIntermediacao")} (${v(values, "valorIntermediacaoExtenso")}).`,
  );
  y = writeParagraph(
    doc,
    "3.2 O pagamento dos honorários à CONTRATADA ocorrerá no momento em que o CONTRATANTE assinar o contrato de compra e venda com o PROPRIETÁRIO do imóvel em questão.",
  );
  y = writeParagraph(
    doc,
    `3.3 O pagamento do CONTRATANTE à CONTRATADA será através de transferência bancária: Banco: ${v(values, "banco")} - Agência: ${v(values, "agencia")} - Conta: ${v(values, "conta")} - PIX: ${v(values, "pix")} Representante Legal: ${v(values, "representanteLegal")}.`,
  );
  y = writeParagraph(
    doc,
    "3.4 Serão devidos os honorários de corretagem, independentemente do arrependimento do CONTRATANTE após a assinatura do contrato de compra e venda.",
  );

  y = writeParagraph(doc, "CLÁUSULA 4ª – DISPOSIÇÕES GERAIS", true);
  y = writeParagraph(
    doc,
    "4.1 Cumpre a CONTRATADA apresentar, ao oferecer o imóvel, dados rigorosamente certos, nunca omitindo detalhes que o depreciem, informando às partes dos riscos e demais circunstâncias que possam influenciar o negócio.",
  );
  y = writeParagraph(
    doc,
    "4.2 A CONTRATADA poderá firmar parcerias ou com outros corretores de imóveis com vistas à execução do presente contrato.",
  );

  y = writeParagraph(doc, "CLÁUSULA 5ª – DA IRREVOGABILIDADE E IRRETRATABILIDADE", true);
  y = writeParagraph(
    doc,
    "As partes celebram o presente contrato de forma irrevogável e irretratável, relativo ao serviço de corretagem, ainda que o CONTRATANTE se arrependa e requeira o destrato de compra e venda do imóvel do PROPRIETÁRIO.",
  );

  y = writeParagraph(doc, "CLÁUSULA 6ª – DA PROTEÇÃO DOS DADOS PESSOAIS", true);
  y = writeParagraph(
    doc,
    "6.1 A CONTRATADA se compromete a obedecer os preceitos da legislação que regula o tratamento de dados pessoais no Brasil, em especial a Lei 12.965/14 (Marco Civil da Internet) e Lei 13.709/2018 (Lei Geral de Proteção de Dados), mantendo o mais completo e absoluto sigilo sobre os dados pessoais que lhe foram confiados, não podendo sob qualquer fundamento ou pretexto divulgar, compartilhar, comercializar (no todo ou em parte) ou deles dar conhecimento a terceiros, sob as penas da lei e responsabilizando-se perante o CONTRATANTE, pelos prejuízos causados pela não observância desta cláusula.",
  );
  y = writeParagraph(
    doc,
    "6.2 Havendo indícios de descumprimento parcial ou total desta cláusula, os CONTRATADOS estarão sujeitos a responsabilização por danos materiais e morais/extra patrimoniais.",
  );

  y = writeParagraph(doc, "CLÁUSULA 7ª – DO FORO DE COMPETÊNCIA", true);
  y = writeParagraph(
    doc,
    "Fica eleito o Foro da Comarca de Recife, Estado de Pernambuco, que será o competente para dirimir quaisquer questões oriundas do presente acordo, renunciando as partes a qualquer outro, por mais privilegiado que seja.",
  );
  y = writeParagraph(
    doc,
    "E para maior de todo o conteúdo aqui exposto, assinam o presente contrato em 03 (três) vias.",
  );

  y = writeParagraph(
    doc,
    `${v(values, "cidade")}, ${formatDateBr(values.data)}`,
  );

  y = writeSignature(
    doc,
    y,
    "CONTRATANTE",
    v(values, "contratanteNome"),
    `CPF: ${v(values, "contratanteCpf")}`,
  );
  y = writeSignature(
    doc,
    y,
    "CONTRATADO",
    v(values, "contratadaNome"),
    `CNPJ: ${v(values, "contratadaCnpj")}`,
  );
  y = writeSignature(
    doc,
    y,
    "TESTEMUNHA 1",
    values.testemunha1Nome?.trim() || undefined,
    values.testemunha1Cpf?.trim()
      ? `CPF: ${values.testemunha1Cpf}`
      : undefined,
  );
  y = writeSignature(
    doc,
    y,
    "TESTEMUNHA 2",
    values.testemunha2Nome?.trim() || undefined,
    values.testemunha2Cpf?.trim()
      ? `CPF: ${values.testemunha2Cpf}`
      : undefined,
  );

  doc.save(
    `contrato-intermediacao-${safeName(v(values, "contratanteNome"))}.pdf`,
  );
}

export function downloadContratoPdf(
  id: ContratoTemplateId,
  values: Values,
) {
  switch (id) {
    case "carta-cancelamento":
      pdfCartaCancelamento(values);
      break;
    case "parentesco-sem-conjuge":
      pdfParentescoSem(values);
      break;
    case "parentesco-com-conjuge":
      pdfParentescoCom(values);
      break;
    case "intermediacao":
      pdfIntermediacao(values);
      break;
  }
}
