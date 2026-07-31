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
};

export async function fetchDashboardCorretor(): Promise<DashboardCorretor> {
  return apiFetch<DashboardCorretor>("/dashboard/corretor");
}
