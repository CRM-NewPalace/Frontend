import { Fragment, useEffect, useMemo, useState } from "react";
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
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export type VendaResumoItem = {
  id: string;
  corretorId?: string | null;
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

type CorretorGrupo = {
  key: string;
  corretor: string;
  vendas: VendaResumoItem[];
  vgv: number;
};

function groupByCorretor(items: VendaResumoItem[]): CorretorGrupo[] {
  const map = new Map<string, CorretorGrupo>();
  for (const item of items) {
    const key = item.corretorId || `nome:${item.corretor}`;
    const existing = map.get(key);
    if (existing) {
      existing.vendas.push(item);
      existing.vgv += item.vgv;
    } else {
      map.set(key, {
        key,
        corretor: item.corretor,
        vendas: [item],
        vgv: item.vgv,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.vgv - a.vgv || a.corretor.localeCompare(b.corretor, "pt-BR"),
  );
}

function ConstrutoraVendasTable({ items }: { items: VendaResumoItem[] }) {
  const grupos = useMemo(() => groupByCorretor(items), [items]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedKeys(new Set());
  }, [items]);

  function toggleGrupo(key: string) {
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Corretor</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">VGV</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grupos.map((grupo) => {
          if (grupo.vendas.length === 1) {
            const venda = grupo.vendas[0];
            return (
              <TableRow key={grupo.key}>
                <TableCell className="font-medium">{grupo.corretor}</TableCell>
                <TableCell>{venda.cliente}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {money(venda.vgv)}
                </TableCell>
              </TableRow>
            );
          }

          const expanded = expandedKeys.has(grupo.key);
          return (
            <Fragment key={grupo.key}>
              <TableRow
                className="cursor-pointer hover:bg-muted/60"
                onClick={() => toggleGrupo(grupo.key)}
              >
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    {grupo.corretor}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {grupo.vendas.length} vendas
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {money(grupo.vgv)}
                </TableCell>
              </TableRow>
              {expanded
                ? grupo.vendas.map((venda) => (
                    <TableRow key={venda.id} className="bg-muted/20">
                      <TableCell className="pl-9 text-sm text-muted-foreground">
                        {venda.empreendimento || dateBr(venda.dataVenda)}
                      </TableCell>
                      <TableCell>{venda.cliente}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(venda.vgv)}
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
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
  const corretoresCount = useMemo(
    () => groupByCorretor(items).length,
    [items],
  );

  const defaultDescription = loading
    ? "Carregando vendas…"
    : mode === "construtora"
      ? `${corretoresCount} corretor${corretoresCount === 1 ? "" : "es"} · ${items.length} venda${items.length === 1 ? "" : "s"} · ${money(totalVgv)}`
      : `${items.length} venda${items.length === 1 ? "" : "s"} · ${money(totalVgv)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? defaultDescription}
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
          ) : mode === "construtora" ? (
            <ConstrutoraVendasTable items={items} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Construtora</TableHead>
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
                    <TableCell>{row.construtora || "—"}</TableCell>
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
