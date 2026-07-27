import { apiFetch } from "@/lib/api";
import type { Role, UserStatus } from "@/lib/auth";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  cargo: string | null;
  role: Role;
  status: UserStatus;
  avatar: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedUsers = {
  data: ApiUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  whatsapp?: string;
  cargo?: string;
  role: Role;
  status?: UserStatus;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  whatsapp?: string | null;
  cargo?: string | null;
  role?: Role;
  status?: UserStatus;
};

export async function fetchUsers(params?: {
  search?: string;
  role?: Role;
  status?: UserStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedUsers> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.role) qs.set("role", params.role);
  if (params?.status) qs.set("status", params.status);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  return apiFetch<PaginatedUsers>(`/users?${qs.toString()}`);
}

export async function createUser(input: CreateUserInput): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users", { method: "POST", body: input });
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}`, { method: "PATCH", body: input });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function resetUserPassword(
  id: string,
  password?: string,
): Promise<{ user: ApiUser; temporaryPassword?: string }> {
  return apiFetch<{ user: ApiUser; temporaryPassword?: string }>(
    `/users/${id}/reset-password`,
    { method: "PATCH", body: password ? { password } : {} },
  );
}
