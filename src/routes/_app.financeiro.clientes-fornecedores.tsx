import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { brl } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/financeiro/clientes-fornecedores")({
  head: () => ({ meta: [{ title: "Clientes e fornecedores — Financeiro" }] }),
  component: ClientesFornecedores,
});

const CLIENTES = [
  { nome: "João Pereira", doc: "123.456.789-00", tipo: "PF", saldo: 24000, status: "Ativo" },
  { nome: "Beatriz Costa", doc: "987.654.321-00", tipo: "PF", saldo: 0, status: "Ativo" },
  { nome: "Construtora Alfa Ltda", doc: "12.345.678/0001-90", tipo: "PJ", saldo: 85000, status: "Ativo" },
  { nome: "Ricardo Santos", doc: "111.222.333-44", tipo: "PF", saldo: 12000, status: "Inativo" },
];

const FORNECEDORES = [
  { nome: "Agência XYZ", doc: "11.222.333/0001-44", categoria: "Marketing", aPagar: 8500, status: "Ativo" },
  { nome: "Imob Corp", doc: "22.333.444/0001-55", categoria: "Estrutura", aPagar: 12000, status: "Ativo" },
  { nome: "Zap Imóveis", doc: "33.444.555/0001-66", categoria: "Marketing", aPagar: 3200, status: "Ativo" },
  { nome: "Contábil Plus", doc: "44.555.666/0001-77", categoria: "Serviços", aPagar: 2800, status: "Ativo" },
];

function ClientesFornecedores() {
  return (
    <div>
      <PageHeader
        title="Clientes e fornecedores"
        description="Cadastro financeiro de clientes e fornecedores."
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo cadastro
          </Button>
        }
      />

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo a receber</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLIENTES.map((c) => (
                  <TableRow key={c.doc}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{c.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.doc}</TableCell>
                    <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                    <TableCell className="text-sm font-semibold text-success">{brl(c.saldo)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "Ativo" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="fornecedores">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>A pagar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FORNECEDORES.map((f) => (
                  <TableRow key={f.doc}>
                    <TableCell className="text-sm font-medium">{f.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.doc}</TableCell>
                    <TableCell><Badge variant="outline">{f.categoria}</Badge></TableCell>
                    <TableCell className="text-sm font-semibold text-destructive">{brl(f.aPagar)}</TableCell>
                    <TableCell><Badge>{f.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
