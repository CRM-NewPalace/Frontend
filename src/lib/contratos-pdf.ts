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

function formatCartaDate(values: Values) {
  if (values.data?.trim()) {
    const [year, month, day] = values.data.slice(0, 10).split("-");
    const monthIndex = Number(month) - 1;
    const months = [
      "JANEIRO",
      "FEVEREIRO",
      "MARÇO",
      "ABRIL",
      "MAIO",
      "JUNHO",
      "JULHO",
      "AGOSTO",
      "SETEMBRO",
      "OUTUBRO",
      "NOVEMBRO",
      "DEZEMBRO",
    ];
    if (year && day && Number.isInteger(monthIndex) && months[monthIndex]) {
      return `${day} DE ${months[monthIndex]} DE ${year}`;
    }
  }
  return `${v(values, "dia")} DE ${v(values, "mes").toUpperCase()} DE 20${v(values, "ano")}`;
}

function safeName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 40);
}

type LoadedLogo = {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
  /** HEX predominante obtido dos pixels da própria logo. */
  primaryHex: string | null;
};

type Rgb = [number, number, number];

function parseHexColor(value?: string | null): Rgb | null {
  const hex = value?.trim().replace(/^#/, "");
  if (!hex || !/^[\da-f]{6}$/i.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: Rgb) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/**
 * Ignora transparência, branco/preto e tons pouco saturados para encontrar
 * a cor de identidade visual predominante da imagem da logo.
 */
function extractLogoPrimaryHex(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const data = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<
    string,
    { score: number; red: number; green: number; blue: number; count: number }
  >();

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 0;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max ? (max - min) / max : 0;
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;

    if (
      alpha < 96 ||
      saturation < 0.22 ||
      luminance < 0.12 ||
      luminance > 0.94
    ) {
      continue;
    }

    const key = [red, green, blue]
      .map((value) => Math.round(value / 24) * 24)
      .join("-");
    const score = saturation * (alpha / 255);
    const bucket = buckets.get(key) ?? {
      score: 0,
      red: 0,
      green: 0,
      blue: 0,
      count: 0,
    };
    bucket.score += score;
    bucket.red += red * score;
    bucket.green += green * score;
    bucket.blue += blue * score;
    bucket.count += score;
    buckets.set(key, bucket);
  }

  const primary = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
  if (!primary || !primary.count) return null;
  return rgbToHex([
    Math.round(primary.red / primary.count),
    Math.round(primary.green / primary.count),
    Math.round(primary.blue / primary.count),
  ]);
}

function absoluteAssetUrl(src: string) {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  ) {
    return src;
  }
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

/** Carrega a logo do tenant para embutir no PDF (best-effort; CORS pode bloquear URLs externas). */
async function loadLogoForPdf(src: string): Promise<LoadedLogo | null> {
  if (typeof window === "undefined" || !src.trim()) return null;
  const url = absoluteAssetUrl(src.trim());
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo load failed"));
      image.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const primaryHex = extractLogoPrimaryHex(ctx, w, h);
    const jpeg =
      /\.jpe?g($|\?)/i.test(url) || url.startsWith("data:image/jpeg");
    return {
      dataUrl: canvas.toDataURL(jpeg ? "image/jpeg" : "image/png"),
      format: jpeg ? "JPEG" : "PNG",
      width: w,
      height: h,
      primaryHex,
    };
  } catch {
    return null;
  }
}

function writeLogo(doc: jsPDF, logo: LoadedLogo, y: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = 130;
  const maxH = 52;
  const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
  const w = Math.max(24, logo.width * scale);
  const h = Math.max(16, logo.height * scale);
  doc.addImage(logo.dataUrl, logo.format, (pageW - w) / 2, y, w, h);
  return y + h + 14;
}

function writeTitle(
  doc: jsPDF,
  title: string,
  y: number,
  color: Rgb = [20, 20, 20],
) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(title, pageW - 96);
  doc.text(lines, pageW / 2, y, { align: "center" });
  return y + lines.length * 16 + 10;
}

function writeCenteredRich(
  doc: jsPDF,
  parts: Array<string | { b: string } | { accent: string }>,
  startY: number,
  color: Rgb,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 132;
  const lineH = 19;
  const tokens: Array<{
    text: string;
    bold: boolean;
    accent: boolean;
    width: number;
  }> = [];

  for (const part of parts) {
    const bold = typeof part !== "string" && "b" in part;
    const accent = typeof part !== "string" && "accent" in part;
    const content =
      typeof part === "string" ? part : bold ? part.b : part.accent;
    for (const word of String(content ?? "").split(/(\s+)/)) {
      if (!word) continue;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(11);
      tokens.push({
        text: word,
        bold,
        accent,
        width: doc.getTextWidth(word),
      });
    }
  }

  let y = startY;
  let line: typeof tokens = [];
  let lineW = 0;
  const flush = () => {
    if (!line.length) return;
    let x = (pageW - lineW) / 2;
    for (const token of line) {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      doc.setTextColor(...(token.accent ? color : [30, 30, 30]));
      doc.text(token.text, x, y);
      x += token.width;
    }
    y += lineH;
    line = [];
    lineW = 0;
  };

  for (const token of tokens) {
    if (lineW + token.width > maxW && !/^\s+$/.test(token.text)) flush();
    if (/^\s+$/.test(token.text) && !line.length) continue;
    line.push(token);
    lineW += token.width;
  }
  flush();
  return y + 4;
}

function drawOrnament(doc: jsPDF, y: number, color: Rgb) {
  const pageW = doc.internal.pageSize.getWidth();
  const center = pageW / 2;
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.7);
  doc.line(center - 105, y, center - 13, y);
  doc.line(center + 13, y, center + 105, y);
  doc.circle(center - 8, y, 2, "F");
  doc.circle(center + 8, y, 2, "F");
  doc.triangle(center, y - 5, center + 5, y, center, y + 5, "F");
  doc.triangle(center, y - 5, center - 5, y, center, y + 5, "F");
}

async function startBrandedDocument(
  doc: jsPDF,
  title: string,
  opts?: { logoUrl?: string | null },
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = opts?.logoUrl?.trim()
    ? await loadLogoForPdf(opts.logoUrl)
    : null;
  const color = parseHexColor(logo?.primaryHex) ?? [30, 30, 30];
  doc.setDrawColor(...color);
  doc.setLineWidth(1.3);
  doc.rect(16, 16, pageW - 32, pageH - 32);
  doc.setLineWidth(0.55);
  doc.rect(23, 23, pageW - 46, pageH - 46);

  let y = 40;
  if (logo) y = writeLogo(doc, logo, y);
  y = writeTitle(doc, title, y + 6, color);
  drawOrnament(doc, y, color);
  return { y: y + 28, color };
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
      tokens.push({ text: String(part.b ?? ""), bold: true });
    }
  }

  for (const token of tokens) {
    const text = String(token.text ?? "");
    if (!text) continue;
    doc.setFont("helvetica", token.bold ? "bold" : "normal");
    const w = doc.getTextWidth(text);
    if (x + w > margin + maxW && !/^\s+$/.test(text)) {
      y += lineH;
      y = ensureSpace(doc, y, lineH);
      x = margin;
    }
    if (/^\s+$/.test(text) && x === margin) continue;
    doc.text(text, x, y);
    x += w;
  }

  return y + lineH + 4;
}

function writeParagraph(doc: jsPDF, y: number, text: string, bold = false) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(String(text ?? ""), pageW - margin * 2);
  for (const line of lines) {
    y = ensureSpace(doc, y, 14);
    doc.text(String(line), margin, y);
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
  color: Rgb = [40, 40, 40],
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  y = ensureSpace(doc, y, 56);
  y += 10;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  const lineW = Math.min(260, pageW - margin * 2);
  doc.line(margin, y, margin + lineW, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(String(label), margin, y);
  y += 12;
  if (name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(String(name), margin, y);
    y += 11;
  }
  if (extra) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(String(extra), margin, y);
    y += 11;
  }
  return y + 8;
}

function writeCenteredSignature(
  doc: jsPDF,
  y: number,
  label: string,
  name: string,
  color: Rgb,
) {
  const pageW = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 76);
  y += 20;
  const lineW = 255;
  const x = (pageW - lineW) / 2;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + lineW, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(label, pageW / 2, y + 13, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(name, pageW / 2, y + 26, { align: "center" });
  return y + 48;
}

async function pdfCartaCancelamento(
  values: Values,
  opts?: { logoUrl?: string | null; primaryColor?: string | null },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = opts?.logoUrl?.trim()
    ? await loadLogoForPdf(opts.logoUrl)
    : null;
  const color = parseHexColor(logo?.primaryHex) ?? [30, 30, 30];
  doc.setDrawColor(...color);
  doc.setLineWidth(1.3);
  doc.rect(16, 16, pageW - 32, pageH - 32);
  doc.setLineWidth(0.55);
  doc.rect(23, 23, pageW - 46, pageH - 46);

  let y = 40;
  if (logo) y = writeLogo(doc, logo, y);
  y = writeTitle(doc, "CARTA DE CANCELAMENTO", y + 6, color);
  drawOrnament(doc, y, color);
  y += 38;

  y = writeCenteredRich(
    doc,
    [
      "EU, ",
      { accent: v(values, "nome").toUpperCase() },
      ", PORTADOR DO RG: ",
      { b: v(values, "rg") },
      " SDS/PE E CPF: ",
      { b: v(values, "cpf") },
      ", VENHO POR MEIO DESTA INFORMAR QUE SOLICITO O CANCELAMENTO DA AVALIAÇÃO HABITACIONAL, REALIZADA EM MEU NOME EM UMA CONSTRUTORA PARA DAR CONTINUIDADE EM OUTRA CONSTRUTORA.",
    ],
    y,
    color,
  );

  y += 18;
  drawOrnament(doc, y, color);
  y += 40;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `${v(values, "cidade").toUpperCase()}, ${formatCartaDate(values)}`,
    pageW / 2,
    y,
    { align: "center" },
  );

  const signatureY = y + 72;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);
  doc.line(pageW / 2 - 115, signatureY, pageW / 2 + 115, signatureY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text("ASSINATURA", pageW / 2, signatureY + 14, { align: "center" });
  drawOrnament(doc, pageH - 50, color);
  doc.save(`carta-cancelamento-${safeName(v(values, "nome"))}.pdf`);
}

async function pdfParentescoSem(
  values: Values,
  opts?: { logoUrl?: string | null },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const header = await startBrandedDocument(
    doc,
    "DECLARAÇÃO DE PARENTESCO, RESIDÊNCIA E AUSÊNCIA DE RENDIMENTOS",
    opts,
  );
  let y = header.y;

  y = writeRich(
    doc,
    [
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
    ],
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "Declaro ainda que não possuo nenhum tipo de rendimento, seja renda formal ou informal exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023 e dependo financeiramente do " +
      v(values, "nomeProponente") +
      ", proponente acima qualificado.",
  );

  y = writeParagraph(
    doc,
    y,
    "Declaro ainda que não participo como dependente de nenhum outro contrato de financiamento habitacional e não possuo financiamento ativo no SFH.",
  );

  y = writeParagraph(
    doc,
    y,
    "RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "Responsabilizo-me pela exatidão e veracidade das informações declaradas e estou ciente de que, se falsas as declarações, ficarei sujeito às penas da lei, ficando, ainda, obrigado(a) a devolver os valores indevidamente sacados da conta vinculada do FGTS e/ou descontos concedidos pelo FGTS nos termos da Resolução do Conselho Curador do FGTS 702/12, suas alterações e aditamentos, acrescidos de correção monetária e juros sem prejuízo do vencimento antecipado da dívida decorrente do crédito concedido, com a consequente cobrança administrativa/judicial.",
  );

  y = writeParagraph(doc, y, `Data: ${formatDateBr(values.data)}`);
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do parente",
    v(values, "nomeParente"),
    header.color,
  );
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do proponente",
    v(values, "nomeProponente"),
    header.color,
  );

  doc.save(`parentesco-sem-conjuge-${safeName(v(values, "nomeParente"))}.pdf`);
}

async function pdfParentescoCom(
  values: Values,
  opts?: { logoUrl?: string | null },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const header = await startBrandedDocument(
    doc,
    "DECLARAÇÃO DE PARENTESCO, RESIDÊNCIA E AUSÊNCIA DE RENDIMENTOS",
    opts,
  );
  let y = header.y;

  y = writeRich(
    doc,
    [
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
    ],
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "Declaro ainda que não possuo nenhum tipo de rendimento, seja renda formal ou informal exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023 e dependo financeiramente do " +
      v(values, "nomeProponente") +
      ", proponente acima qualificado. Declaro ainda que não participo como dependente de nenhum outro contrato de financiamento habitacional e não possuo financiamento ativo no SFH.",
  );

  y = writeRich(
    doc,
    [
      "Eu, ",
      { b: v(values, "nomeConjuge") },
      ", declaro que também não possuo nenhum tipo de rendimento, seja renda formal ou informal, exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023.",
    ],
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "Responsabilizo-me pela exatidão e veracidade das informações declaradas e estou ciente de que, se falsas as declarações, ficarei sujeito às penas da lei, ficando, ainda, obrigado(a) a devolver os valores indevidamente sacados da conta vinculada do FGTS e/ou descontos concedidos pelo FGTS nos termos da Resolução do Conselho Curador do FGTS 702/12, suas alterações e aditamentos, acrescidos de correção monetária e juros sem prejuízo do vencimento antecipado da dívida decorrente do crédito concedido, com a consequente cobrança administrativa/judicial.",
  );

  y = writeParagraph(doc, y, `Data: ${formatDateBr(values.data)}`);
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do parente",
    v(values, "nomeParente"),
    header.color,
  );
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do cônjuge do parente",
    v(values, "nomeConjuge"),
    header.color,
  );
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do proponente",
    v(values, "nomeProponente"),
    header.color,
  );

  doc.save(`parentesco-com-conjuge-${safeName(v(values, "nomeParente"))}.pdf`);
}

async function pdfIntermediacao(values: Values, logoUrl?: string | null) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 40;
  if (logoUrl?.trim()) {
    const logo = await loadLogoForPdf(logoUrl);
    if (logo) {
      y = writeLogo(doc, logo, y);
    }
  }
  y = writeTitle(
    doc,
    "CONTRATO DE INTERMEDIAÇÃO PARA COMPRA/VENDA DE IMÓVEL",
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "Por este instrumento particular, as partes qualificadas na Cláusula 1ª resolvem, por livre e espontânea vontade, firmar o presente contrato de intermediação para fins de compra/venda de imóvel conforme os termos e condições estabelecidos nas cláusulas seguintes:",
  );

  y = writeParagraph(doc, y, "CLÁUSULA 1ª – DAS PARTES", true);
  y = writeParagraph(doc, y, "Denominado de CONTRATANTE(s):", true);
  y = writeParagraph(doc, y, `Nome: ${v(values, "contratanteNome")}`);
  y = writeParagraph(
    doc,
    y,
    `CPF: ${v(values, "contratanteCpf")}    RG: ${v(values, "contratanteRg")}`,
  );
  y = writeParagraph(doc, y, `Tel.: ${v(values, "contratanteTel")}`);
  y = writeParagraph(doc, y, `E-mail: ${v(values, "contratanteEmail")}`);
  y = writeParagraph(
    doc,
    y,
    `Endereço: ${v(values, "contratanteEndereco")}    CEP: ${v(values, "contratanteCep")}`,
  );

  y = writeParagraph(doc, y, "Denominado PROPRIETÁRIO:", true);
  y = writeParagraph(doc, y, `Nome: ${v(values, "proprietarioNome")}`);
  y = writeParagraph(doc, y, `CNPJ/CPF: ${v(values, "proprietarioCnpj")}`);
  y = writeParagraph(doc, y, `Endereço: ${v(values, "proprietarioEndereco")}`);
  y = writeParagraph(doc, y, `Tel.: ${v(values, "proprietarioTel")}`);

  y = writeParagraph(doc, y, "Denominado CONTRATADA:", true);
  y = writeParagraph(doc, y, `Nome: ${v(values, "contratadaNome")}`);
  y = writeParagraph(
    doc,
    y,
    `CNPJ: ${v(values, "contratadaCnpj")}    CRECI: ${v(values, "contratadaCreci")}`,
  );
  y = writeParagraph(doc, y, `Endereço: ${v(values, "contratadaEndereco")}`);
  y = writeParagraph(doc, y, `E-mail: ${v(values, "contratadaEmail")}`);

  y = writeParagraph(doc, y, "CLÁUSULA 2ª – OBJETO DO CONTRATO", true);
  y = writeParagraph(
    doc,
    y,
    "O presente contrato tem por finalidade a contratação dos serviços profissionais de corretagem da CONTRATADA pelo CONTRATANTE, nos moldes do artigo 726 do Código Civil, e será considerado concluído, quando da assinatura do contrato de promessa de compra e venda entre o CONTRATANTE e o PROPRIETÁRIO do imóvel comercializado.",
  );
  y = writeParagraph(doc, y, `Construtora: ${v(values, "construtora")}`);
  y = writeParagraph(doc, y, `Empreendimento: ${v(values, "empreendimento")}`);
  y = writeParagraph(doc, y, `Unidade: ${v(values, "unidade")}`);
  y = writeParagraph(doc, y, `Andar: ${v(values, "andar")}`);
  y = writeParagraph(
    doc,
    y,
    `Descrição do Imóvel: ${v(values, "descricaoImovel")}`,
  );
  y = writeParagraph(doc, y, `Preço do Imóvel: R$ ${v(values, "precoImovel")}`);
  y = writeParagraph(
    doc,
    y,
    `Valor da intermediação: R$ ${v(values, "valorIntermediacao")}`,
  );

  y = writeParagraph(
    doc,
    y,
    "CLÁUSULA 3ª – HONORÁRIOS DE CORRETAGEM – DO PAGAMENTO",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    `3.1 Para pagamento dos serviços de intermediação, o CONTRATANTE pagará à CONTRATADA, a título de honorários de corretagem, o valor de R$ ${v(values, "valorIntermediacao")} (${v(values, "valorIntermediacaoExtenso")}).`,
  );
  y = writeParagraph(
    doc,
    y,
    "3.2 O pagamento dos honorários à CONTRATADA ocorrerá no momento em que o CONTRATANTE assinar o contrato de compra e venda com o PROPRIETÁRIO do imóvel em questão.",
  );
  y = writeParagraph(
    doc,
    y,
    `3.3 O pagamento do CONTRATANTE à CONTRATADA será através de transferência bancária: Banco: ${v(values, "banco")} - Agência: ${v(values, "agencia")} - Conta: ${v(values, "conta")} - PIX: ${v(values, "pix")} Representante Legal: ${v(values, "representanteLegal")}.`,
  );
  y = writeParagraph(
    doc,
    y,
    "3.4 Serão devidos os honorários de corretagem, independentemente do arrependimento do CONTRATANTE após a assinatura do contrato de compra e venda.",
  );

  y = writeParagraph(doc, y, "CLÁUSULA 4ª – DISPOSIÇÕES GERAIS", true);
  y = writeParagraph(
    doc,
    y,
    "4.1 Cumpre a CONTRATADA apresentar, ao oferecer o imóvel, dados rigorosamente certos, nunca omitindo detalhes que o depreciem, informando às partes dos riscos e demais circunstâncias que possam influenciar o negócio.",
  );
  y = writeParagraph(
    doc,
    y,
    "4.2 A CONTRATADA poderá firmar parcerias ou com outros corretores de imóveis com vistas à execução do presente contrato.",
  );

  y = writeParagraph(
    doc,
    y,
    "CLÁUSULA 5ª – DA IRREVOGABILIDADE E IRRETRATABILIDADE",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "As partes celebram o presente contrato de forma irrevogável e irretratável, relativo ao serviço de corretagem, ainda que o CONTRATANTE se arrependa e requeira o destrato de compra e venda do imóvel do PROPRIETÁRIO.",
  );

  y = writeParagraph(
    doc,
    y,
    "CLÁUSULA 6ª – DA PROTEÇÃO DOS DADOS PESSOAIS",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "6.1 A CONTRATADA se compromete a obedecer os preceitos da legislação que regula o tratamento de dados pessoais no Brasil, em especial a Lei 12.965/14 (Marco Civil da Internet) e Lei 13.709/2018 (Lei Geral de Proteção de Dados), mantendo o mais completo e absoluto sigilo sobre os dados pessoais que lhe foram confiados, não podendo sob qualquer fundamento ou pretexto divulgar, compartilhar, comercializar (no todo ou em parte) ou deles dar conhecimento a terceiros, sob as penas da lei e responsabilizando-se perante o CONTRATANTE, pelos prejuízos causados pela não observância desta cláusula.",
  );
  y = writeParagraph(
    doc,
    y,
    "6.2 Havendo indícios de descumprimento parcial ou total desta cláusula, os CONTRATADOS estarão sujeitos a responsabilização por danos materiais e morais/extra patrimoniais.",
  );

  y = writeParagraph(doc, y, "CLÁUSULA 7ª – DO FORO DE COMPETÊNCIA", true);
  y = writeParagraph(
    doc,
    y,
    "Fica eleito o Foro da Comarca de Recife, Estado de Pernambuco, que será o competente para dirimir quaisquer questões oriundas do presente acordo, renunciando as partes a qualquer outro, por mais privilegiado que seja.",
  );
  y = writeParagraph(
    doc,
    y,
    "E para maior de todo o conteúdo aqui exposto, assinam o presente contrato em 03 (três) vias.",
  );

  y = writeParagraph(
    doc,
    y,
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
    [
      `CNPJ: ${v(values, "contratadaCnpj")}`,
      v(values, "contratadaCreci")
        ? `CRECI: ${v(values, "contratadaCreci")}`
        : "",
    ]
      .filter(Boolean)
      .join("  "),
  );
  y = writeSignature(
    doc,
    y,
    "TESTEMUNHA 1",
    values.testemunha1Nome?.trim() || undefined,
    values.testemunha1Cpf?.trim() ? `CPF: ${values.testemunha1Cpf}` : undefined,
  );
  y = writeSignature(
    doc,
    y,
    "TESTEMUNHA 2",
    values.testemunha2Nome?.trim() || undefined,
    values.testemunha2Cpf?.trim() ? `CPF: ${values.testemunha2Cpf}` : undefined,
  );

  doc.save(
    `contrato-intermediacao-${safeName(v(values, "contratanteNome"))}.pdf`,
  );
}

export async function downloadContratoPdf(
  id: ContratoTemplateId,
  values: Values,
  opts?: { logoUrl?: string | null; primaryColor?: string | null },
) {
  switch (id) {
    case "carta-cancelamento":
      await pdfCartaCancelamento(values, opts);
      break;
    case "parentesco-sem-conjuge":
      await pdfParentescoSem(values, opts);
      break;
    case "parentesco-com-conjuge":
      await pdfParentescoCom(values, opts);
      break;
    case "intermediacao":
      await pdfIntermediacao(values, opts?.logoUrl);
      break;
  }
}
