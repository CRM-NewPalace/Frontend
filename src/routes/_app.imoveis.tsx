import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Plus } from "lucide-react";
import { SemConexao, BotaoSemConexao } from "@/components/sem-conexao";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Imob CRM" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader
        title="Imóveis"
        description="Sem conexão com o banco de dados."
        actions={
          <BotaoSemConexao>
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </BotaoSemConexao>
        }
      />
      <SemConexao
        title="Sem conexão"
        description="Sem conexão com o banco de dados. O módulo Imóveis ainda não possui API."
      />
    </div>
  );
}
