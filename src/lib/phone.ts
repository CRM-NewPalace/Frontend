/** Utilitários de telefone brasileiro (com DDD). */

/** Só dígitos, no máximo 11 (DDD + número). */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Máscara visual progressiva:
 * - (81
 * - (81) 9
 * - (81) 9999-9999   (fixo, 10 dígitos)
 * - (81) 99999-9999  (celular, 11 dígitos)
 */
export function formatPhone(value: string): string {
  const d = phoneDigits(value);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Aceita fixo (10) ou celular (11, terceiro dígito = 9), DDD 11–99.
 */
export function isValidPhone(value: string): boolean {
  const d = phoneDigits(value);
  if (d.length < 10 || d.length > 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

export const PHONE_PLACEHOLDER = "(81) 99999-9999";

export const PHONE_INVALID_MESSAGE =
  "Informe um telefone válido com DDD, ex.: (81) 99999-9999.";
