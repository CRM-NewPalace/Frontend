import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, KeyRound, Ban, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Imob CRM" }] }),
  component: Usuarios,
});

const USERS = [
  { nome: "Ana Souza", email: "ana@imob.com", tel: "(11) 99999-0001", cargo: "Diretora", perfil: "Administrador", status: "Ativo", ultimo: "há 5 min" },
  { nome: "Carlos Lima", email: "carlos@imob.com", tel: "(11) 99999-0002", cargo: "Gerente comercial", perfil: "Gerente", status: "Ativo", ultimo: "há 1 h" },
  { nome: "Marina Alves", email: "marina@imob.com", tel: "(11) 99999-0003", cargo: "Corretora sênior", perfil: "Corretor", status: "Ativo", ultimo: "há 20 min" },
  { nome: "Pedro Henrique", email: "pedro@imob.com", tel: "(11) 99999-0004", cargo: "Corretor", perfil: "Corretor", status: "Ativo", ultimo: "ontem" },
  { nome: "Sofia Ramos", email: "sofia@imob.com", tel: "(11) 99999-0005", cargo: "Corretora", perfil: "Corretor", status: "Ativo", ultimo: "há 2 h" },
  { nome: "Laura Prado", email: "laura@imob.com", tel: "(11) 99999-0006", cargo: "Corretora", perfil: "Corretor", status: "Inativo", ultimo: "há 15 dias" },
];

function perfilColor(p: string) {
  return p === "Administrador" ? "bg-primary/15 text-primary border-primary/30"
    : p === "Gerente" ? "bg-info/15 text-info border-info/30"
    : "bg-muted text-muted-foreground";
}

function Usuarios() {
  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Controle de acesso e permissões da equipe."
        actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo usuário</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {USERS.map((u) => (
              <TableRow key={u.email}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{u.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                    <span className="text-sm font-medium">{u.nome}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell className="text-sm">{u.tel}</TableCell>
                <TableCell className="text-sm">{u.cargo}</TableCell>
                <TableCell><Badge variant="outline" className={perfilColor(u.perfil)}>{u.perfil}</Badge></TableCell>
                <TableCell>
                  <Badge variant={u.status === "Ativo" ? "default" : "secondary"}>{u.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.ultimo}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pencil className="w-3.5 h-3.5 mr-2" />Editar</DropdownMenuItem>
                      <DropdownMenuItem><KeyRound className="w-3.5 h-3.5 mr-2" />Resetar senha</DropdownMenuItem>
                      <DropdownMenuItem><Ban className="w-3.5 h-3.5 mr-2" />Bloquear</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
