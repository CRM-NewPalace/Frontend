/** Número WhatsApp comercial Zone Connection (DDI + DDD + número, só dígitos). */
const WHATSAPP_NUMBER = "558192215812";

/** WhatsApp comercial de Sites e Landing Pages. */
const WHATSAPP_SITES_NUMBER = "5581989877451";

export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: import.meta.env.VITE_APP_NAME ?? "Zone Connection",
  whatsappNumber: WHATSAPP_NUMBER,
  whatsappSitesNumber: WHATSAPP_SITES_NUMBER,
} as const;

export function getWhatsAppUrl(message?: string, phone = WHATSAPP_NUMBER) {
  const number = phone.replace(/\D/g, "");
  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}

export function getSitesWhatsAppUrl(message?: string) {
  return getWhatsAppUrl(message, WHATSAPP_SITES_NUMBER);
}
