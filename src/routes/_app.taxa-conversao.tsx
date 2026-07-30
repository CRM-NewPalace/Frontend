import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Plus } from "lucide-react";
import { SemConexao, BotaoSemConexao } from "@/components/sem-conexao";

export const Route = createFileRoute("/_app/taxa-conversao")({
  head: () => ({ meta: [{ title: "Taxa de conversão — NP Connect" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader
        title="Taxa de conversão"
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
        description="Sem conexão com o banco de dados. O módulo Taxa de conversão ainda não possui API."
      />
    </div>
  );
}
