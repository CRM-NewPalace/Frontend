import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { brl, type Proposta } from "@/lib/mock-data";
import { EMPREENDIMENTOS } from "@/lib/empreendimentos-newpalace";
import { useLeads } from "@/lib/leads-store";
import { usePropostas } from "@/lib/propostas-store";
import {
  Plus, MoreHorizontal, Eye, Pencil, Trash2, FileText, Wallet,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Imob CRM" }] }),
  component: PropostasPage,
});

const STATUS_OPTIONS: Proposta["status"][] = [
  "Rascunho",
  "Enviada",
  "Em análise",
  "Aceita",
  "Recusada",
];

type FormState = {
  lead: string;
  imovel: string;
  valor: string;
  entrada: string;
  parcelas: string;
  status: Proposta["status"];
};

type FormMode = "create" | "edit";

function statusVariant(s: string) {
  switch (s) {
    case "Aceita": return "bg-success/15 text-success border-success/30";
    case "Recusada": return "bg-destructive/15 text-destructive border-destructive/30";
    case "Em análise": return "bg-warning/15 text-warning-foreground border-warning/30";
    case "Enviada": return "bg-info/15 text-info border-info/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function todayLabel() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

function parseMoney(value: string) {
  const n = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function emptyForm(lead = "", imovel = ""): FormState {
  return {
    lead,
    imovel,
    valor: "",
    entrada: "",
    parcelas: "360",
    status: "Rascunho",
  };
}

function formFromProposta(p: Proposta): FormState {
  return {
    lead: p.lead,
    imovel: p.imovel,
    valor: String(p.valor),
    entrada: String(p.entrada),
    parcelas: String(p.parcelas),
    status: p.status,
  };
}

function nextCodigo(propostas: Proposta[]) {
  const nums = propostas
    .map((p) => Number(p.id.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `P${String(max + 1).padStart(3, "0")}`;
}

function PropostasPage() {
  const { leads } = useLeads();
  const { propostas, addProposta, updateProposta, deleteProposta } = usePropostas();

  const leadOptions = useMemo(
    () => [...new Set(leads.map((l) => l.nome))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [leads],
  );
  const imovelOptions = useMemo(
    () => EMPREENDIMENTOS.map((e) => e.titulo).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());

  const [detail, setDetail] = useState<Proposta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Proposta | null>(null);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm(leadOptions[0] ?? "", imovelOptions[0] ?? ""));
    setFormOpen(true);
  }

  function openEdit(p: Proposta) {
    setFormMode("edit");
    setEditingId(p.id);
    setForm(formFromProposta(p));
    setFormOpen(true);
    setDetail(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lead = form.lead.trim();
    const imovel = form.imovel.trim();
    const valor = parseMoney(form.valor);
    const entrada = parseMoney(form.entrada);
    const parcelas = Number(form.parcelas);

    if (!lead || !imovel) {
      toast.error("Selecione o lead e o imóvel.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (!Number.isFinite(entrada) || entrada < 0) {
      toast.error("Informe uma entrada válida.");
      return;
    }
    if (entrada > valor) {
      toast.error("A entrada não pode ser maior que o valor.");
      return;
    }
    if (!Number.isFinite(parcelas) || parcelas < 1) {
      toast.error("Informe o número de parcelas.");
      return;
    }

    if (formMode === "create") {
      const nova: Proposta = {
        id: nextCodigo(propostas),
        lead,
        imovel,
        valor,
        entrada,
        parcelas,
        status: form.status,
        data: todayLabel(),
      };
      addProposta(nova);
      toast.success(`Proposta ${nova.id} criada.`);
    } else if (editingId) {
      updateProposta(editingId, {
        lead,
        imovel,
        valor,
        entrada,
        parcelas,
        status: form.status,
      });
      toast.success("Proposta atualizada.");
    }

    setFormOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteProposta(deleteTarget.id);
    toast.success(`Proposta ${deleteTarget.id} excluída.`);
    if (detail?.id === deleteTarget.id) setDetail(null);
    setDeleteTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="Propostas"
        description={`${propostas.length} propostas em análise, aceitas e recusadas.`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Nova proposta
          </Button>
        }
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
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {propostas.map((p) => (
              <TableRow
                key={p.id}
                className="hover:bg-muted/40 cursor-pointer"
                onClick={() => setDetail(p)}
              >
                <TableCell className="font-medium text-sm">{p.id}</TableCell>
                <TableCell className="text-sm">{p.lead}</TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">{p.imovel}</TableCell>
                <TableCell className="text-sm font-semibold">{brl(p.valor)}</TableCell>
                <TableCell className="text-sm">{brl(p.entrada)}</TableCell>
                <TableCell className="text-sm">{p.parcelas}x</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant(p.status)}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.data}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetail(p)}>
                        <Eye className="w-4 h-4 mr-2" />Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4 mr-2" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {propostas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhuma proposta cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Criar / Editar */}
      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={formMode === "edit" ? <Pencil className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar proposta" : "Nova proposta"}
        description={
          formMode === "edit"
            ? "Atualize os dados da proposta comercial."
            : "Monte uma proposta vinculada a um lead e empreendimento."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(78vh,720px)]">
          <FormDialogBody>
            <FormSection icon={<FileText className="w-3.5 h-3.5 text-primary" />} title="Proposta">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Lead</Label>
                {leadOptions.length > 0 ? (
                  <Select value={form.lead} onValueChange={(v) => setForm((f) => ({ ...f, lead: v }))}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione o lead" /></SelectTrigger>
                    <SelectContent>
                      {leadOptions.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.lead}
                    onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value }))}
                    placeholder="Nome do lead"
                    className="h-10 bg-background"
                    required
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Imóvel / Empreendimento</Label>
                <Select value={form.imovel} onValueChange={(v) => setForm((f) => ({ ...f, imovel: v }))}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione o imóvel" /></SelectTrigger>
                  <SelectContent>
                    {imovelOptions.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                    {/* Keep legacy codes editable */}
                    {form.imovel && !imovelOptions.includes(form.imovel) && (
                      <SelectItem value={form.imovel}>{form.imovel}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Proposta["status"] }))}
                >
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSection>

            <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Valores">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prop-valor" className="text-xs text-muted-foreground">Valor (R$)</Label>
                  <Input
                    id="prop-valor"
                    inputMode="decimal"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                    placeholder="620000"
                    className="h-10 bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-entrada" className="text-xs text-muted-foreground">Entrada (R$)</Label>
                  <Input
                    id="prop-entrada"
                    inputMode="decimal"
                    value={form.entrada}
                    onChange={(e) => setForm((f) => ({ ...f, entrada: e.target.value }))}
                    placeholder="120000"
                    className="h-10 bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-parcelas" className="text-xs text-muted-foreground">Parcelas</Label>
                  <Input
                    id="prop-parcelas"
                    type="number"
                    min={1}
                    value={form.parcelas}
                    onChange={(e) => setForm((f) => ({ ...f, parcelas: e.target.value }))}
                    className="h-10 bg-background"
                    required
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>

          <FormDialogActions
            hint={
              formMode === "edit"
                ? "As alterações ficam só nesta sessão (demo)."
                : "A proposta fica disponível na listagem."
            }
          >
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {formMode === "edit" ? "Salvar alterações" : "Criar proposta"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      {/* Visualizar */}
      <FormDialogShell
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.id ?? "Detalhes da proposta"}
        description={
          detail ? (
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={statusVariant(detail.status)}>{detail.status}</Badge>
              <span>Criada em {detail.data}</span>
            </span>
          ) : undefined
        }
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection icon={<FileText className="w-3.5 h-3.5 text-primary" />} title="Proposta">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Lead" value={detail.lead} />
                  <DetailField label="Status" value={detail.status} />
                  <DetailField label="Imóvel" value={detail.imovel} className="sm:col-span-2" />
                </div>
              </FormSection>
              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Valores">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <DetailField label="Valor" value={brl(detail.valor)} />
                  <DetailField label="Entrada" value={brl(detail.entrada)} />
                  <DetailField label="Parcelas" value={`${detail.parcelas}x`} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint={`Criada em ${detail.data}`}>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => openEdit(detail)}>
                <Pencil className="w-4 h-4" />Editar
              </Button>
              <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => setDeleteTarget(detail)}>
                <Trash2 className="w-4 h-4" />Excluir
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      {/* Excluir */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `A proposta ${deleteTarget.id} de ${deleteTarget.lead} será removida permanentemente.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
