import { apiFetchFile } from "@/lib/api";

export async function downloadContratoApiPdf(
  templateId: string,
  values: Record<string, string>,
) {
  const { blob, filename } = await apiFetchFile("/contratos/pdf", {
    method: "POST",
    body: { templateId, values },
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "contrato.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
