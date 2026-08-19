import { useEffect, useMemo, useState } from "react";
import { Briefcase, FileSignature, Library, Shield } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { useTenantTheme } from "@/lib/tenant-theme";
import {
  hasSeenSidebarReorgNotice,
  markSidebarReorgNoticeSeen,
} from "@/lib/sidebar-reorg-notice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GROUPS = [
  {
    title: "Operação",
    icon: Briefcase,
    hint: "Atendimento do dia a dia",
    items: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/leads", label: "Leads" },
      { to: "/funil", label: "Funil" },
      { to: "/triagem", label: "Triagem" },
      { to: "/agenda", label: "Agenda" },
      { to: "/clientes", label: "Clientes" },
      { to: "/funil-clientes", label: "Funil de Clientes" },
      { to: "/leads-perdidos", label: "Leads Perdidos" },
      { to: "/clientes-perdidos", label: "Perda de cliente" },
    ],
  },
  {
    title: "Fechamento",
    icon: FileSignature,
    hint: "Do processo à venda",
    items: [
      { to: "/documentacao", label: "Documentação" },
      { to: "/propostas", label: "Propostas" },
      { to: "/contratos", label: "Contratos" },
      { to: "/vendas", label: "Vendas" },
    ],
  },
  {
    title: "Catálogo",
    icon: Library,
    hint: "Consulta na hora de atender",
    items: [
      { to: "/construtoras", label: "Construtoras" },
      { to: "/imoveis", label: "Imóveis" },
    ],
  },
  {
    title: "Gestão",
    icon: Shield,
    hint: "Time, resultado e ajustes",
    items: [
      { to: "/corretores", label: "Ranking" },
      { to: "/atrasos", label: "Atrasos" },
      { to: "/metas", label: "Metas" },
      { to: "/resultado", label: "Análise" },
      { to: "/taxa-conversao", label: "Taxa de conversão" },
      { to: "/equipes", label: "Equipes" },
      { to: "/usuarios", label: "Usuários" },
      { to: "/configuracoes", label: "Configurações" },
    ],
  },
] as const;

export function SidebarReorgNotice() {
  const user = getSession();
  const { modules } = useTenantTheme();
  const plano = user?.tenant?.plano ?? null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (hasSeenSidebarReorgNotice(user.id)) return;
    setOpen(true);
  }, [user?.id]);

  const groups = useMemo(() => {
    if (!user) return [];
    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessRoute(user.role, item.to, modules, plano),
      ),
    })).filter((group) => group.items.length > 0);
  }, [user, modules, plano]);

  function dismiss() {
    markSidebarReorgNoticeSeen(user?.id);
    setOpen(false);
  }

  if (!user || groups.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>O menu foi reorganizado</DialogTitle>
          <DialogDescription>
            Os módulos continuam os mesmos. Mudou só o lugar no menu da esquerda,
            para seguir o fluxo do atendimento. Este aviso aparece só uma vez.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.title}
                className="rounded-xl border bg-muted/30 px-3 py-2.5"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#079ED4]/12 text-[#04648A]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {group.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {group.hint}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-foreground/80">
                  {group.items.map((item) => item.label).join(" · ")}
                </p>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" onClick={dismiss}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
