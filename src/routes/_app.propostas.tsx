import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROPOSTAS, brl } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Imob CRM" }] }),
  component: Propostas,
});

function statusVariant(s: string) {
  switch (s) {
    case "Aceita": return "bg-success/15 text-success border-success/30";
    case "Recusada": return "bg-destructive/15 text-destructive border-destructive/30";
    case "Em análise": return "bg-warning/15 text-warning-foreground border-warning/30";
    case "Enviada": return "bg-info/15 text-info border-info/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function Propostas() {
  return (
    <div>
      <PageHeader
        title="Propostas"
        description="Propostas em análise, aceitas e recusadas."
        actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Nova proposta</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Imóvel</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PROPOSTAS.map((p) => (
              <TableRow key={p.id} className="hover:bg-muted/40">
                <TableCell className="font-medium text-sm">{p.id}</TableCell>
                <TableCell className="text-sm">{p.lead}</TableCell>
                <TableCell className="text-sm">{p.imovel}</TableCell>
                <TableCell className="text-sm font-semibold">{brl(p.valor)}</TableCell>
                <TableCell className="text-sm">{brl(p.entrada)}</TableCell>
                <TableCell className="text-sm">{p.parcelas}x</TableCell>
                <TableCell><Badge variant="outline" className={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.data}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
