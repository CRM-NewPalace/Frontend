import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroTitulosPanel } from "@/components/financeiro-titulos-panel";

export const Route = createFileRoute("/_app/financeiro/contas-a-pagar")({
  head: () => ({ meta: [{ title: "Contas a pagar — Zone Connection" }] }),
  component: Page,
});

function Page() {
  return (
    <FinanceiroTitulosPanel
      tipo="pagar"
      title="Contas a pagar"
      description="Obrigações com fornecedores e parceiros — cadastro, parcelamento e baixa. Comissões ficam em Comissão."
      ocultarComissao
    />
  );
}
