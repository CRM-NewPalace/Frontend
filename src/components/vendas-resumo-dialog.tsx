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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCpfCnpj, cn } from "@/lib/utils";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  UserRound,
  Wallet,
} from "lucide-react";

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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type CorretorGrupo = {
  key: string;
  corretor: string;
  creci: string | null;
  gerente: string | null;
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
        creci: item.creci,
        gerente: item.gerente,
        vendas: [item],
        vgv: item.vgv,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.vgv - a.vgv || a.corretor.localeCompare(b.corretor, "pt-BR"),
  );
}

export function ConstrutoraVendasTable({
  items,
  detailed = false,
}: {
  items: VendaResumoItem[];
  detailed?: boolean;
}) {
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
        <TableRow className="hover:bg-transparent">
          <TableHead>Corretor</TableHead>
          {detailed ? (
            <>
              <TableHead>CRECI</TableHead>
              <TableHead>Gerente</TableHead>
              <TableHead>Empreendimento</TableHead>
            </>
          ) : null}
          <TableHead>Cliente</TableHead>
          {detailed ? <TableHead>CPF</TableHead> : null}
          <TableHead className="text-right">VGV</TableHead>
          {detailed ? <TableHead>Data</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {grupos.map((grupo) => {
          if (grupo.vendas.length === 1) {
            const venda = grupo.vendas[0];
            return (
              <TableRow key={grupo.key}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                        {initials(grupo.corretor)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{grupo.corretor}</span>
                  </div>
                </TableCell>
                {detailed ? (
                  <>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {grupo.creci || "—"}
                    </TableCell>
                    <TableCell>{grupo.gerente || "—"}</TableCell>
                    <TableCell>{venda.empreendimento || "—"}</TableCell>
                  </>
                ) : null}
                <TableCell>{venda.cliente}</TableCell>
                {detailed ? (
                  <TableCell className="tabular-nums">
                    {venda.clienteCpf ? formatCpfCnpj(venda.clienteCpf) : "—"}
                  </TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums font-semibold">
                  {money(venda.vgv)}
                </TableCell>
                {detailed ? (
                  <TableCell className="tabular-nums text-muted-foreground">
                    {dateBr(venda.dataVenda)}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          }

          const expanded = expandedKeys.has(grupo.key);
          return (
            <Fragment key={grupo.key}>
              <TableRow
                className="cursor-pointer bg-muted/30 hover:bg-muted/60"
                onClick={() => toggleGrupo(grupo.key)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                        {initials(grupo.corretor)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium">{grupo.corretor}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {grupo.vendas.length} vendas
                      </div>
                    </div>
                  </div>
                </TableCell>
                {detailed ? (
                  <>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {grupo.creci || "—"}
                    </TableCell>
                    <TableCell>{grupo.gerente || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                  </>
                ) : null}
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {grupo.vendas.length} vendas
                  </Badge>
                </TableCell>
                {detailed ? (
                  <TableCell className="text-muted-foreground">—</TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums font-semibold">
                  {money(grupo.vgv)}
                </TableCell>
                {detailed ? (
                  <TableCell className="text-muted-foreground">—</TableCell>
                ) : null}
              </TableRow>
              {expanded
                ? grupo.vendas.map((venda) => (
                    <TableRow key={venda.id} className="bg-muted/10">
                      <TableCell
                        className={cn(
                          "text-sm text-muted-foreground",
                          detailed ? "pl-14" : "pl-12",
                        )}
                      >
                        {detailed ? "Venda" : venda.empreendimento || dateBr(venda.dataVenda)}
                      </TableCell>
                      {detailed ? (
                        <>
                          <TableCell />
                          <TableCell />
                          <TableCell>{venda.empreendimento || "—"}</TableCell>
                        </>
                      ) : null}
                      <TableCell>{venda.cliente}</TableCell>
                      {detailed ? (
                        <TableCell className="tabular-nums">
                          {venda.clienteCpf
                            ? formatCpfCnpj(venda.clienteCpf)
                            : "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right tabular-nums">
                        {money(venda.vgv)}
                      </TableCell>
                      {detailed ? (
                        <TableCell className="tabular-nums text-muted-foreground">
                          {dateBr(venda.dataVenda)}
                        </TableCell>
                      ) : null}
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
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b bg-linear-to-br from-primary/10 via-background to-background px-6 py-5 pr-12">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>
            {description ?? defaultDescription}
          </DialogDescription>
          {!loading && items.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border bg-background/80 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  Vendas
                </div>
                <div className="mt-0.5 text-base font-semibold tabular-nums">
                  {items.length}
                </div>
              </div>
              <div className="rounded-xl border bg-background/80 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  VGV
                </div>
                <div className="mt-0.5 text-base font-semibold tabular-nums">
                  {money(totalVgv)}
                </div>
              </div>
              <div className="col-span-2 rounded-xl border bg-background/80 px-3 py-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {mode === "construtora" ? (
                    <UserRound className="h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                  {mode === "construtora" ? "Corretores" : "Construtoras"}
                </div>
                <div className="mt-0.5 text-base font-semibold tabular-nums">
                  {mode === "construtora"
                    ? corretoresCount
                    : new Set(items.map((item) => item.construtora).filter(Boolean))
                        .size}
                </div>
              </div>
            </div>
          ) : null}
        </DialogHeader>
        <div className="max-h-[58vh] overflow-auto px-1 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando vendas…
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma venda encontrada.
            </p>
          ) : mode === "construtora" ? (
            <ConstrutoraVendasTable items={items} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                    <TableCell className="font-medium">
                      {row.construtora || "—"}
                    </TableCell>
                    <TableCell>{row.empreendimento || "—"}</TableCell>
                    <TableCell>{row.cliente}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.clienteCpf ? formatCpfCnpj(row.clienteCpf) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {money(row.vgv)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
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
