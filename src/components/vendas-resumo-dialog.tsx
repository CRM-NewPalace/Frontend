import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCpfCnpj } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type VendaResumoItem = {
  id: string;
  corretor: string;
  creci: string | null;
  gerente: string | null;
  construtora?: string | null;
  empreendimento: string | null;
  cliente: string;
  clienteCpf: string | null;
  vgv: number;
  dataVenda: string | null;
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateBr(iso: string | null | undefined) {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

export function VendasResumoDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  loading,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: VendaResumoItem[];
  loading: boolean;
  mode: "corretor" | "construtora";
}) {
  const totalVgv = items.reduce((sum, item) => sum + item.vgv, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              (loading
                ? "Carregando vendas…"
                : `${items.length} venda${items.length === 1 ? "" : "s"} · ${money(totalVgv)}`)}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando vendas…
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma venda encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {mode === "construtora" ? (
                    <>
                      <TableHead>Corretor</TableHead>
                      <TableHead>CRECI</TableHead>
                      <TableHead>Gerente</TableHead>
                    </>
                  ) : (
                    <TableHead>Construtora</TableHead>
                  )}
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">VGV</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    {mode === "construtora" ? (
                      <>
                        <TableCell className="font-medium">
                          {row.corretor}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.creci || "—"}
                        </TableCell>
                        <TableCell>{row.gerente || "—"}</TableCell>
                      </>
                    ) : (
                      <TableCell>{row.construtora || "—"}</TableCell>
                    )}
                    <TableCell>{row.empreendimento || "—"}</TableCell>
                    <TableCell>{row.cliente}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.clienteCpf ? formatCpfCnpj(row.clienteCpf) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {money(row.vgv)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {dateBr(row.dataVenda)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
