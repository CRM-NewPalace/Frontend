import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  FormDialogShell, FormDialogBody, FormDialogActions, FormSection, DetailField,
} from "@/components/form-dialog";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, MoreHorizontal, Eye, Pencil, Trash2, UserPlus, Building2,
} from "lucide-react";
import { brl } from "@/lib/mock-data";
import {
  useFinanceiroPessoas,
  type ClienteFinanceiro,
  type ClienteTipo,
  type FornecedorFinanceiro,
  type PessoaStatus,
} from "@/lib/financeiro-pessoas-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/clientes-fornecedores")({
  head: () => ({ meta: [{ title: "Clientes e fornecedores — Financeiro" }] }),
  component: ClientesFornecedores,
});

type TabKind = "clientes" | "fornecedores";
type DialogMode = "create" | "edit" | "view" | null;

const emptyCliente = (): Omit<ClienteFinanceiro, "id"> => ({
  nome: "",
  doc: "",
  tipo: "PF",
  email: "",
  telefone: "",
  saldo: 0,
  status: "Ativo",
  observacoes: "",
});

const emptyFornecedor = (): Omit<FornecedorFinanceiro, "id"> => ({
  nome: "",
  doc: "",
  categoria: "Serviços",
  email: "",
  telefone: "",
  aPagar: 0,
  status: "Ativo",
  observacoes: "",
});

function initials(nome: string) {
  return nome.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

function parseMoney(raw: string): number {
  const n = Number(
    raw.trim().replace(/\s/g, "").replace(/R\$\s?/i, "").replace(/\./g, "").replace(",", "."),
  );
  return Number.isFinite(n) ? n : 0;
}

function ClientesFornecedores() {
  const {
    clientes,
    fornecedores,
    addCliente,
    updateCliente,
    deleteCliente,
    addFornecedor,
    updateFornecedor,
    deleteFornecedor,
  } = useFinanceiroPessoas();

  const [tab, setTab] = useState<TabKind>("clientes");
  const [mode, setMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [cli, setCli] = useState(emptyCliente);
  const [forn, setForn] = useState(emptyFornecedor);
  const [saldoInput, setSaldoInput] = useState("0,00");
  const [aPagarInput, setAPagarInput] = useState("0,00");

  const dialogOpen = mode !== null;
  const readOnly = mode === "view";

  const title = useMemo(() => {
    if (tab === "clientes") {
      if (mode === "create") return "Novo cliente";
      if (mode === "edit") return "Editar cliente";
      if (mode === "view") return "Detalhes do cliente";
    } else {
      if (mode === "create") return "Novo fornecedor";
      if (mode === "edit") return "Editar fornecedor";
      if (mode === "view") return "Detalhes do fornecedor";
    }
    return "";
  }, [tab, mode]);

  function openCreate() {
    setEditingId(null);
    if (tab === "clientes") {
      setCli(emptyCliente());
      setSaldoInput("0,00");
    } else {
      setForn(emptyFornecedor());
      setAPagarInput("0,00");
    }
    setMode("create");
  }

  function openViewCliente(c: ClienteFinanceiro) {
    setEditingId(c.id);
    setCli({ ...c });
    setSaldoInput(c.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setMode("view");
  }

  function openEditCliente(c: ClienteFinanceiro) {
    setEditingId(c.id);
    setCli({ ...c });
    setSaldoInput(c.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setMode("edit");
  }

  function openViewFornecedor(f: FornecedorFinanceiro) {
    setEditingId(f.id);
    setForn({ ...f });
    setAPagarInput(f.aPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setMode("view");
  }

  function openEditFornecedor(f: FornecedorFinanceiro) {
    setEditingId(f.id);
    setForn({ ...f });
    setAPagarInput(f.aPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setMode("edit");
  }

  function closeDialog() {
    setMode(null);
    setEditingId(null);
  }

  function save() {
    if (tab === "clientes") {
      if (!cli.nome.trim() || !cli.doc.trim()) {
        toast.error("Informe nome e documento do cliente");
        return;
      }
      const payload = { ...cli, nome: cli.nome.trim(), doc: cli.doc.trim(), saldo: parseMoney(saldoInput) };
      if (mode === "create") {
        addCliente({ ...payload, id: `cli-${Date.now()}` });
        toast.success("Cliente cadastrado");
      } else if (editingId) {
        updateCliente(editingId, payload);
        toast.success("Cliente atualizado");
      }
    } else {
      if (!forn.nome.trim() || !forn.doc.trim()) {
        toast.error("Informe nome e CNPJ do fornecedor");
        return;
      }
      const payload = {
        ...forn,
        nome: forn.nome.trim(),
        doc: forn.doc.trim(),
        aPagar: parseMoney(aPagarInput),
      };
      if (mode === "create") {
        addFornecedor({ ...payload, id: `for-${Date.now()}` });
        toast.success("Fornecedor cadastrado");
      } else if (editingId) {
        updateFornecedor(editingId, payload);
        toast.success("Fornecedor atualizado");
      }
    }
    closeDialog();
  }

  function removeCliente(id: string, nome: string) {
    if (!window.confirm(`Excluir o cliente "${nome}"?`)) return;
    deleteCliente(id);
    toast.success("Cliente excluído");
    if (editingId === id) closeDialog();
  }

  function removeFornecedor(id: string, nome: string) {
    if (!window.confirm(`Excluir o fornecedor "${nome}"?`)) return;
    deleteFornecedor(id);
    toast.success("Fornecedor excluído");
    if (editingId === id) closeDialog();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes e fornecedores"
        description="Cadastro financeiro — criar, consultar, editar e excluir."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo cadastro
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKind)}>
        <TabsList>
          <TabsTrigger value="clientes">Clientes ({clientes.length})</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores ({fornecedores.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo a receber</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {initials(c.nome)}
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
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewCliente(c)}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditCliente(c)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeCliente(c.id, c.nome)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!clientes.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                      Nenhum cliente cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>A pagar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedores.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm font-medium">{f.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.doc}</TableCell>
                    <TableCell><Badge variant="outline">{f.categoria}</Badge></TableCell>
                    <TableCell className="text-sm font-semibold text-destructive">{brl(f.aPagar)}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === "Ativo" ? "default" : "secondary"}>{f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewFornecedor(f)}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditFornecedor(f)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeFornecedor(f.id, f.nome)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!fornecedores.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                      Nenhum fornecedor cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialogShell
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) closeDialog(); }}
        icon={tab === "clientes" ? <UserPlus className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        title={title}
        description={
          tab === "clientes"
            ? "Dados do cliente no cadastro financeiro."
            : "Dados do fornecedor no cadastro financeiro."
        }
        footer={
          <FormDialogActions>
            <Button variant="outline" onClick={closeDialog}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {readOnly ? (
              <Button
                onClick={() => {
                  if (tab === "clientes" && editingId) {
                    const c = clientes.find((x) => x.id === editingId);
                    if (c) openEditCliente(c);
                  }
                  if (tab === "fornecedores" && editingId) {
                    const f = fornecedores.find((x) => x.id === editingId);
                    if (f) openEditFornecedor(f);
                  }
                }}
              >
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            ) : (
              <Button onClick={save}>{mode === "create" ? "Cadastrar" : "Salvar"}</Button>
            )}
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {tab === "clientes" ? (
            readOnly ? (
              <FormSection title="Informações">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Nome" value={cli.nome} />
                  <DetailField label="Documento" value={cli.doc} />
                  <DetailField label="Tipo" value={cli.tipo} />
                  <DetailField label="Status" value={cli.status} />
                  <DetailField label="Email" value={cli.email} />
                  <DetailField label="Telefone" value={cli.telefone} />
                  <DetailField label="Saldo a receber" value={brl(cli.saldo)} />
                  <DetailField label="Observações" value={cli.observacoes || "—"} className="sm:col-span-2" />
                </div>
              </FormSection>
            ) : (
              <FormSection title="Dados do cliente">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Nome</Label>
                    <Input value={cli.nome} onChange={(e) => setCli({ ...cli, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Documento (CPF/CNPJ)</Label>
                    <Input value={cli.doc} onChange={(e) => setCli({ ...cli, doc: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select
                      value={cli.tipo}
                      onValueChange={(v) => setCli({ ...cli, tipo: v as ClienteTipo })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PF">PF</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={cli.email}
                      onChange={(e) => setCli({ ...cli, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      value={cli.telefone}
                      onChange={(e) => setCli({ ...cli, telefone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Saldo a receber</Label>
                    <Input value={saldoInput} onChange={(e) => setSaldoInput(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={cli.status}
                      onValueChange={(v) => setCli({ ...cli, status: v as PessoaStatus })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Observações</Label>
                    <Textarea
                      rows={3}
                      value={cli.observacoes}
                      onChange={(e) => setCli({ ...cli, observacoes: e.target.value })}
                    />
                  </div>
                </div>
              </FormSection>
            )
          ) : readOnly ? (
            <FormSection title="Informações">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Nome" value={forn.nome} />
                <DetailField label="CNPJ" value={forn.doc} />
                <DetailField label="Categoria" value={forn.categoria} />
                <DetailField label="Status" value={forn.status} />
                <DetailField label="Email" value={forn.email} />
                <DetailField label="Telefone" value={forn.telefone} />
                <DetailField label="A pagar" value={brl(forn.aPagar)} />
                <DetailField label="Observações" value={forn.observacoes || "—"} className="sm:col-span-2" />
              </div>
            </FormSection>
          ) : (
            <FormSection title="Dados do fornecedor">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome</Label>
                  <Input value={forn.nome} onChange={(e) => setForn({ ...forn, nome: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input value={forn.doc} onChange={(e) => setForn({ ...forn, doc: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={forn.categoria}
                    onValueChange={(v) => setForn({ ...forn, categoria: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Marketing", "Estrutura", "Serviços", "Pessoal", "Outros"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={forn.email}
                    onChange={(e) => setForn({ ...forn, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    value={forn.telefone}
                    onChange={(e) => setForn({ ...forn, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor a pagar</Label>
                  <Input value={aPagarInput} onChange={(e) => setAPagarInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={forn.status}
                    onValueChange={(v) => setForn({ ...forn, status: v as PessoaStatus })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={forn.observacoes}
                    onChange={(e) => setForn({ ...forn, observacoes: e.target.value })}
                  />
                </div>
              </div>
            </FormSection>
          )}
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}
