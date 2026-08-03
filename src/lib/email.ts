/** E-mails sintéticos gravados quando o usuário não informa e-mail. */
const PLACEHOLDER_EMAIL_SUFFIXES = [
  "@sem-email.local",
  "@pendente.local",
  "@sememail.local",
] as const;

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return true;
  const normalized = email.trim().toLowerCase();
  return PLACEHOLDER_EMAIL_SUFFIXES.some((suffix) =>
    normalized.endsWith(suffix),
  );
}

/** Texto para exibir na UI; vazio se for placeholder ou ausente. */
export function displayEmail(email: string | null | undefined): string {
  if (isPlaceholderEmail(email)) return "";
  return email!.trim();
}
