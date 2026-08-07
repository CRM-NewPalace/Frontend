import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
  DetailField,
} from "@/components/form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Eye,
  UserX,
  Sparkles,
  Wallet,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  getLostClientesCache,
  loadLostClientes,
} from "@/lib/lost-clientes-cache";
import type { LostLead } from "@/lib/lost-leads-cache";
import {
  exportLostLeadsToExcel,
  exportLostLeadsToPdf,
} from "@/lib/lost-leads-io";
import { brl, prioridadeBadgeClass } from "@/lib/crm-types";
import { useCatalog } from "@/lib/catalog-store";
import { displayEmail } from "@/lib/email";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes-perdidos")({
  head: () => ({ meta: [{ title: "Perda de cliente — Zone Connection" }] }),
  component: ClientesPerdidos,
});

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ClientesPerdidos() {
  const user = getSession();
  const { funnelStages } = useCatalog();
  const cached = getLostClientesCache();
  const [items, setItems] = useState<LostLead[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<LostLead | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? Boolean(getLostClientesCache()?.length);
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await loadLostClientes({ force: true });
      setItems(data);
    } catch (err) {
      if (!getLostClientesCache()?.length) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar clientes perdidos.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh({ silent: Boolean(cached) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((l) =>
      `${l.nome} ${l.email} ${l.telefone} ${l.motivoPerda} ${l.perdidoPor}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <PageHeader
        title="Perda de cliente"
        description={
          loading
            ? "Carregando..."
            : `${filtered.length} cliente(s) removidos da sua carteira.${
                refreshing ? " Atualizando…" : ""
              }`
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || filtered.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  exportLostLeadsToExcel(
                    filtered,
                    `clientes-perdidos-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    { sheetName: "Clientes perdidos" },
                  )
                }
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  exportLostLeadsToPdf(
                    filtered,
                    `clientes-perdidos-${new Date().toISOString().slice(0, 10)}.pdf`,
                    user?.tenant?.name?.trim() || "Imobiliária",
                    {
                      title: "Perda de cliente",
                      entityLabel: "cliente(s)",
                    },
                  )
                }
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Card className="mb-4">
        <div className="p-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, motivo..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Excluído por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum cliente perdido.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                          {initials(l.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{l.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.telefone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-sm max-w-[220px] truncate"
                    title={l.motivoPerda}
                  >
                    {l.motivoPerda}
                  </TableCell>
                  <TableCell className="text-sm">{l.perdidoPor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.perdidoAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Detalhes"
                      onClick={() => setDetail(l)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<UserX className="w-5 h-5" />}
        title={detail?.nome ?? "Cliente perdido"}
        description={detail ? `Motivo: ${detail.motivoPerda}` : undefined}
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detail.email) || "—"}
                  />
                  <DetailField label="Origem" value={detail.origem} />
                </div>
              </FormSection>
              <FormSection
                icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                title="Interesse"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField
                    label="Renda"
                    value={detail.renda != null ? brl(detail.renda) : "—"}
                  />
                  <DetailField
                    label="Prioridade"
                    value={
                      <Badge
                        className={prioridadeBadgeClass(detail.prioridade)}
                      >
                        {detail.prioridade}
                      </Badge>
                    }
                  />
                  <DetailField
                    label="Última etapa"
                    value={
                      funnelStages.find((s) => s.id === detail.stage)?.name ??
                      detail.stage
                    }
                  />
                  <DetailField label="Excluído em" value={detail.perdidoAt} />
                  <DetailField label="Excluído por" value={detail.perdidoPor} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDetail(null)}
              >
                Fechar
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>
    </div>
  );
}
