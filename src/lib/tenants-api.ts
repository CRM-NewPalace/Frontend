import { apiFetch } from "@/lib/api";
import type { UserStatus } from "@/lib/auth";

export type TenantAdminUser = {
  id: string;
  tenantId?: string | null;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: UserStatus;
  logoUrl: string | null;
  primaryColor: string | null;
  sidebarStyle: string;
  density: string;
  homePath: string;
  modules: Record<string, boolean> | null;
  admin: TenantAdminUser | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantDetail = Tenant & {
  userCount: number;
  metaConnections: TenantMetaConnection[];
  ozapConnections: TenantOzapConnection[];
};

export type TenantMetaConnection = {
  id: string;
  tenantId: string;
  pageId: string;
  pageAccessToken: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantOzapConnection = {
  id: string;
  tenantId: string;
  instanceId: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantInput = {
  name: string;
  slug: string;
  status?: UserStatus;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type CreateTenantAdminInput = {
  name: string;
  email: string;
  password: string;
};

export type CreateTenantResult = Tenant & {
  admin: TenantAdminUser;
};

export type UpdateTenantInput = {
  name?: string;
  status?: UserStatus;
  logoUrl?: string | null;
  primaryColor?: string | null;
  sidebarStyle?: "default" | "dark" | "compact";
  density?: "comfortable" | "compact";
  homePath?: string;
  modules?: Record<string, boolean> | null;
};

export type CreateMetaConnectionInput = {
  pageId: string;
  pageAccessToken: string;
  ativo?: boolean;
};

export type UpdateMetaConnectionInput = {
  pageAccessToken?: string;
  ativo?: boolean;
};

export type CreateOzapConnectionInput = {
  instanceId: number;
  ativo?: boolean;
};

export type UpdateOzapConnectionInput = {
  ativo?: boolean;
};

export type ResetTenantAdminPasswordResult = {
  user: TenantAdminUser;
  temporaryPassword: string;
};

export async function fetchTenants(): Promise<Tenant[]> {
  return apiFetch<Tenant[]>("/tenants");
}

export async function fetchTenant(id: string): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(`/tenants/${id}`);
}

export async function createTenant(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  return apiFetch<CreateTenantResult>("/tenants", {
    method: "POST",
    body: input,
  });
}

export async function createTenantInitialAdmin(
  tenantId: string,
  input: CreateTenantAdminInput,
): Promise<TenantAdminUser> {
  return apiFetch<TenantAdminUser>(`/tenants/${tenantId}/admin`, {
    method: "POST",
    body: input,
  });
}

export async function resetTenantAdminPassword(
  tenantId: string,
): Promise<ResetTenantAdminPasswordResult> {
  return apiFetch<ResetTenantAdminPasswordResult>(
    `/tenants/${tenantId}/admin/reset-password`,
    { method: "POST" },
  );
}

export async function updateTenant(
  id: string,
  input: UpdateTenantInput,
): Promise<Tenant> {
  return apiFetch<Tenant>(`/tenants/${id}`, { method: "PATCH", body: input });
}

export async function createMetaConnection(
  tenantId: string,
  input: CreateMetaConnectionInput,
): Promise<TenantMetaConnection> {
  return apiFetch<TenantMetaConnection>(
    `/tenants/${tenantId}/meta-connections`,
    { method: "POST", body: input },
  );
}

export async function updateMetaConnection(
  tenantId: string,
  connectionId: string,
  input: UpdateMetaConnectionInput,
): Promise<TenantMetaConnection> {
  return apiFetch<TenantMetaConnection>(
    `/tenants/${tenantId}/meta-connections/${connectionId}`,
    { method: "PATCH", body: input },
  );
}

export async function deleteMetaConnection(
  tenantId: string,
  connectionId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/tenants/${tenantId}/meta-connections/${connectionId}`,
    { method: "DELETE" },
  );
}

export async function createOzapConnection(
  tenantId: string,
  input: CreateOzapConnectionInput,
): Promise<TenantOzapConnection> {
  return apiFetch<TenantOzapConnection>(
    `/tenants/${tenantId}/ozap-connections`,
    { method: "POST", body: input },
  );
}

export async function updateOzapConnection(
  tenantId: string,
  connectionId: string,
  input: UpdateOzapConnectionInput,
): Promise<TenantOzapConnection> {
  return apiFetch<TenantOzapConnection>(
    `/tenants/${tenantId}/ozap-connections/${connectionId}`,
    { method: "PATCH", body: input },
  );
}

export async function deleteOzapConnection(
  tenantId: string,
  connectionId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/tenants/${tenantId}/ozap-connections/${connectionId}`,
    { method: "DELETE" },
  );
}

/** Gera slug kebab-case a partir do nome da imobiliária. */
export function slugifyTenantName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tenant"
  );
}
