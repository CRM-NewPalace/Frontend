/** Converte valor em reais para texto por extenso (pt-BR). */

const UNIDADES = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
];
const DEZ_A_DEZENOVE = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function ate999(n: number): string {
  if (n <= 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CENTENAS[c] ?? "");
  if (resto >= 10 && resto <= 19) {
    parts.push(DEZ_A_DEZENOVE[resto - 10] ?? "");
  } else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (d) parts.push(DEZENAS[d] ?? "");
    if (u) parts.push(UNIDADES[u] ?? "");
  }
  return parts.filter(Boolean).join(" e ");
}

function joinChunks(chunks: string[]) {
  if (chunks.length <= 1) return chunks[0] ?? "";
  const last = chunks[chunks.length - 1] ?? "";
  const rest = chunks.slice(0, -1).join(" ");
  return `${rest} e ${last}`;
}

export function reaisPorExtenso(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  const totalCents = Math.round(value * 100);
  if (totalCents === 0) return "zero reais";

  const reais = Math.floor(totalCents / 100);
  const centavos = totalCents % 100;

  const chunks: string[] = [];
  const bilhoes = Math.floor(reais / 1_000_000_000);
  const milhoes = Math.floor((reais % 1_000_000_000) / 1_000_000);
  const milhares = Math.floor((reais % 1_000_000) / 1_000);
  const resto = reais % 1_000;

  if (bilhoes) {
    chunks.push(
      bilhoes === 1 ? "um bilhão" : `${ate999(bilhoes)} bilhões`,
    );
  }
  if (milhoes) {
    chunks.push(
      milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`,
    );
  }
  if (milhares) {
    chunks.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  }
  if (resto) chunks.push(ate999(resto));

  let reaisPart = "";
  if (reais === 1) {
    reaisPart = "um real";
  } else if (reais > 1) {
    const joined = joinChunks(chunks);
    const exactMillions =
      reais % 1_000_000 === 0 &&
      /milhão|milhões|bilhão|bilhões/.test(joined);
    reaisPart = exactMillions ? `${joined} de reais` : `${joined} reais`;
  }

  let centsPart = "";
  if (centavos === 1) centsPart = "um centavo";
  else if (centavos > 1) centsPart = `${ate999(centavos)} centavos`;

  if (!reaisPart) return centsPart;
  if (!centsPart) return reaisPart;
  return `${reaisPart} e ${centsPart}`;
}
