import { apiFetch } from "@/lib/api";
import type { AnaliseStatus } from "@/lib/analise-api";

export type DashboardCorretor = {
  periodo: { inicio: string; fim: string };
  carteira: {
    leads: number;
    clientes: number;
    novosContatos: number;
  };
  funil: { etapa: string; total: number }[];
  conversaoEmAnalise: number;
  analises: { status: AnaliseStatus; total: number }[];
  documentacao: {
    registrados: number;
    vendidos: number;
    emAndamento: number;
    vgvVendidoMes: number;
  };
  agenda: {
    totalHoje: number;
    pendentesHoje: number;
    concluidosHoje: number;
    itens: {
      id: string;
      titulo: string;
      tipo: string;
      status: string;
      startsAt: string;
      contato: string | null;
      categoria: "pessoal" | "compartilhada";
    }[];
  };
};

export async function fetchDashboardCorretor(): Promise<DashboardCorretor> {
  return apiFetch<DashboardCorretor>("/dashboard/corretor");
}
