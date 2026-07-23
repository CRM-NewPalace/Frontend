import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/mock-auth";
import { useLeads } from "@/lib/leads-store";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Imob CRM" }] }),
  component: Clientes,
});

function Clientes() {
  const user = getSession();
  const isCorretor = user?.role === "corretor";
  const { leads } = useLeads();
  const clientes = isCorretor && user
    ? leads.filter((l) => l.corretor === user.name)
    : leads;

  return (
    <div>
      <PageHeader
        title={isCorretor ? "Meus clientes" : "Clientes"}
        description={
          isCorretor
            ? "Clientes e contatos atribuídos a você."
            : "Base de contatos e clientes ativos."
        }
        actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo cliente</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Cidade</TableHead>
              {!isCorretor && <TableHead>Corretor</TableHead>}
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((l) => (
              <TableRow key={l.id} className="hover:bg-muted/40">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {l.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{l.nome}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{l.telefone}</TableCell>
                <TableCell><Badge variant="outline">{l.interesse}</Badge></TableCell>
                <TableCell className="text-sm">{l.bairro}</TableCell>
                {!isCorretor && <TableCell className="text-sm">{l.corretor}</TableCell>}
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {l.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
