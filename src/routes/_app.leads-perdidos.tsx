import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { Search, Eye, Trash2, UserX, Sparkles, Wallet } from "lucide-react";
import { ApiError } from "@/lib/api";
import { deleteLeadApi } from "@/lib/leads-api";
import {
  getLostLeadsCache,
  loadLostLeads,
  removeLostLeadFromCache,
  type LostLead,
} from "@/lib/lost-leads-cache";
import { brl, prioridadeBadgeClass } from "@/lib/crm-types";
import { useCatalog } from "@/lib/catalog-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/leads-perdidos")({
  head: () => ({ meta: [{ title: "Leads Perdidos — Imob CRM" }] }),
  component: LeadsPerdidos,
});

function initials(nome: string) {
  return nome.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function LeadsPerdidos() {
  const { funnelStages } = useCatalog();
  const cached = getLostLeadsCache();
  const [leads, setLeads] = useState<LostLead[]>(cached ?? []);
  // Só mostra "Carregando..." na primeira visita sem cache.
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<LostLead | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<LostLead | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? Boolean(getLostLeadsCache()?.length);
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await loadLostLeads({ force: true });
      setLeads(data);
    } catch (err) {
      // Com cache na tela, não apaga a lista — só avisa.
      if (!getLostLeadsCache()?.length) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar leads perdidos.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh({ silent: Boolean(cached) });
    // Só no mount — refresh cobre o sync em background.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      `${l.nome} ${l.email} ${l.telefone} ${l.motivoPerda} ${l.corretor} ${l.perdidoPor}`
        .toLowerCase()
        .includes(q),
    );
  }, [leads, search]);

  async function confirmPurge() {
    if (!purgeTarget) return;
    const target = purgeTarget;
    // Otimista: some da lista na hora.
    setLeads((prev) => prev.filter((l) => l.id !== target.id));
    removeLostLeadFromCache(target.id);
    setPurgeTarget(null);
    if (detail?.id === target.id) setDetail(null);
    toast.success(`Lead ${target.nome} excluído definitivamente.`);

    try {
      await deleteLeadApi(target.id);
    } catch (err) {
      // Rollback
      setLeads((prev) => [target, ...prev.filter((l) => l.id !== target.id)]);
      toast.error(err instanceof ApiError ? err.message : "Não foi possível excluir.");
      void refresh({ silent: true });
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads Perdidos"
        description={
          loading
            ? "Carregando..."
            : `${filtered.length} lead(s) removidos da operação — só admin vê esta lista.${
                refreshing ? " Atualizando…" : ""
              }`
        }
      />

      <Card className="mb-4">
        <div className="p-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, motivo, corretor..."
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
              <TableHead>Lead</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Excluído por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum lead perdido.
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
                        <div className="text-xs text-muted-foreground">{l.telefone}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm max-w-[220px] truncate" title={l.motivoPerda}>
                    {l.motivoPerda}
                  </TableCell>
                  <TableCell className="text-sm">{l.corretor}</TableCell>
                  <TableCell className="text-sm">{l.perdidoPor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.perdidoAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Detalhes" onClick={() => setDetail(l)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Excluir definitivamente"
                        onClick={() => setPurgeTarget(l)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
        title={detail?.nome ?? "Lead perdido"}
        description={detail ? `Motivo: ${detail.motivoPerda}` : undefined}
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Contato">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField label="E-mail" value={detail.email} />
                  <DetailField label="Origem" value={detail.origem} />
                  <DetailField label="Corretor" value={detail.corretor} />
                </div>
              </FormSection>
              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Interesse">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField
                    label="Renda"
                    value={detail.renda != null ? brl(detail.renda) : "—"}
                  />
                  <DetailField
                    label="Prioridade"
                    value={<Badge className={prioridadeBadgeClass(detail.prioridade)}>{detail.prioridade}</Badge>}
                  />
                  <DetailField
                    label="Última etapa"
                    value={funnelStages.find((s) => s.id === detail.stage)?.name ?? detail.stage}
                  />
                  <DetailField label="Excluído em" value={detail.perdidoAt} />
                  <DetailField label="Excluído por" value={detail.perdidoPor} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button type="button" variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
              <Button type="button" variant="destructive" onClick={() => setPurgeTarget(detail)}>
                <Trash2 className="w-4 h-4 mr-1" />Excluir definitivamente
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog open={!!purgeTarget} onOpenChange={(o) => !o && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              {purgeTarget
                ? `${purgeTarget.nome} será removido do banco para sempre. Esta ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmPurge();
              }}
            >
              Excluir do banco
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
