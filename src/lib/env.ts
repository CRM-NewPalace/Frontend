export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: import.meta.env.VITE_APP_NAME ?? "Zone Connection",
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER ?? "",
} as const;

export function getWhatsAppUrl(message?: string) {
  const number = String(env.whatsappNumber ?? "").replace(/\D/g, "");
  if (!number) return "#contato";

  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}
