import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOCK_PARCEIROS,
  brl,
  type TipoParceiro,
} from "@/lib/financeiro-mock";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/clientes-fornecedores")({
  head: () => ({
    meta: [{ title: "Clientes e fornecedores — Zone Connection" }],
  }),
  component: Page,
});

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos os tipos" },
  { value: "cliente", label: "Clientes" },
  { value: "fornecedor", label: "Fornecedores" },
  { value: "ambos", label: "Ambos" },
];

const STATUS_ATIVO = [
  { value: "todos", label: "Ativos e inativos" },
  { value: "ativo", label: "Somente ativos" },
  { value: "inativo", label: "Somente inativos" },
];

function Page() {
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [ativo, setAtivo] = useState("todos");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PARCEIROS.filter((p) => {
      if (tipo !== "todos" && p.tipo !== (tipo as TipoParceiro)) return false;
      if (ativo === "ativo" && !p.ativo) return false;
      if (ativo === "inativo" && p.ativo) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.documento.includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    });
  }, [search, tipo, ativo]);

  const hasActive = Boolean(search || tipo !== "todos" || ativo !== "todos");

  return (
    <div>
      <PageHeader
        title="Clientes e fornecedores"
        description="Cadastro de parceiros financeiros"
        actions={
          <Button
            onClick={() =>
              toast.message("Em breve", {
                description:
                  "Disponível quando a API financeira estiver conectada.",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo parceiro
          </Button>
        }
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar nome, CNPJ, cidade…"
        tipo={tipo}
        onTipoChange={setTipo}
        tipoOptions={TIPO_OPTIONS}
        extra={
          <Select value={ativo} onValueChange={setAtivo}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ATIVO.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setTipo("todos");
          setAtivo("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Saldo aberto</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum parceiro encontrado para os filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {p.documento}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {p.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.cidade}</TableCell>
                  <TableCell className="text-sm">
                    <div>{p.email}</div>
                    <div className="text-muted-foreground">{p.telefone}</div>
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${
                      p.saldoAberto < 0
                        ? "text-destructive"
                        : p.saldoAberto > 0
                          ? "text-emerald-600"
                          : ""
                    }`}
                  >
                    {brl(p.saldoAberto)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        p.ativo
                          ? "border-transparent bg-emerald-500/15 text-emerald-700"
                          : "text-muted-foreground"
                      }
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} de {MOCK_PARCEIROS.length} parceiros
      </p>
    </div>
  );
}
