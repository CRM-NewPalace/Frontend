import { apiFetch } from "@/lib/api";
import type { TenantBranding } from "@/lib/auth";

export type TenantCompanyProfile = Pick<
  TenantBranding,
  | "id"
  | "name"
  | "slug"
  | "documento"
  | "creci"
  | "email"
  | "telefone"
  | "endereco"
  | "cidade"
  | "logoUrl"
>;

export type UpdateTenantCompanyInput = {
  name?: string;
  documento?: string;
  creci?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
};

export async function fetchTenantCompany(): Promise<TenantCompanyProfile> {
  return apiFetch<TenantCompanyProfile>("/tenant/company");
}

export async function updateTenantCompany(
  input: UpdateTenantCompanyInput,
): Promise<TenantCompanyProfile> {
  return apiFetch<TenantCompanyProfile>("/tenant/company", {
    method: "PATCH",
    body: input,
  });
}
