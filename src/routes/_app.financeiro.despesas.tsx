import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroTitulosPanel } from "@/components/financeiro-titulos-panel";

export const Route = createFileRoute("/_app/financeiro/despesas")({
  head: () => ({ meta: [{ title: "Despesas — Zone Connection" }] }),
  component: Page,
});

function Page() {
  return (
    <FinanceiroTitulosPanel
      tipo="pagar"
      title="Despesas"
      description="Consulta das obrigações com fornecedores e parceiros — somente visualização. Comissões ficam em Comissão e em Contas a pagar."
      readOnly
      ocultarComissao
    />
  );
}
