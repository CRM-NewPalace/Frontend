import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroTitulosPanel } from "@/components/financeiro-titulos-panel";

export const Route = createFileRoute("/_app/financeiro/contas-a-receber")({
  head: () => ({ meta: [{ title: "Contas a receber — Zone Connection" }] }),
  component: Page,
});

function Page() {
  return (
    <FinanceiroTitulosPanel
      tipo="receber"
      title="Contas a receber"
      description="Títulos a receber de clientes e parceiros — cadastro, parcelamento e baixa"
    />
  );
}
