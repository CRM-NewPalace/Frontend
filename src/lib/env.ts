/** Número WhatsApp comercial Zone Connection (DDI + DDD + número, só dígitos). */
const WHATSAPP_NUMBER = "558192215812";

export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: import.meta.env.VITE_APP_NAME ?? "Zone Connection",
  whatsappNumber: WHATSAPP_NUMBER,
} as const;

export function getWhatsAppUrl(message?: string) {
  const number = WHATSAPP_NUMBER.replace(/\D/g, "");
  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}
