import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Plus } from "lucide-react";
import { SemConexao, BotaoSemConexao } from "@/components/sem-conexao";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas — NP Connect" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader
        title="Metas"
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
        description="Sem conexão com o banco de dados. O módulo Metas ainda não possui API."
      />
    </div>
  );
}
