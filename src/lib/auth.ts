import { apiFetch, sessionCache } from "@/lib/api";

export type Role = "admin" | "gerente" | "corretor";
export type UserStatus = "ativo" | "inativo";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  phone?: string | null;
  cargo?: string | null;
  avatar?: string | null;
  lastLoginAt?: string | null;
}

interface LoginResponse {
  user: AuthUser;
}

/** Evita bater em /auth/me a cada troca de rota (antes bloqueava a navegação ~3s). */
const SESSION_MAX_AGE_MS = 2 * 60_000;
let lastValidatedAt = 0;

/**
 * Sessão em cache (sessionStorage), preenchida no login.
 * Continua síncrona para as telas que leem o usuário durante a renderização;
 * a validação real contra o backend acontece em `ensureSession`.
 * Tokens JWT NÃO ficam aqui — só em cookies httpOnly no browser.
 */
export function getSession(): AuthUser | null {
  return sessionCache.getUser<AuthUser>();
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    skipAuth: true,
    body: { email, password },
  });

  sessionCache.setUser(data.user);
  lastValidatedAt = Date.now();
  return data.user;
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } catch {
    // Mesmo se o backend estiver fora, a sessão local precisa ser encerrada.
  } finally {
    sessionCache.clear();
    lastValidatedAt = 0;
  }
}

/** Busca o usuário atual no backend e atualiza o cache local. */
export async function fetchMe(): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>("/auth/me");
  sessionCache.setUser(user);
  lastValidatedAt = Date.now();
  return user;
}

/**
 * Valida a sessão. Usa cache curto para não bloquear cada navegação
 * com uma ida à API; force=true ignora o cache (ex.: após login).
 */
export async function ensureSession(options?: {
  force?: boolean;
}): Promise<AuthUser | null> {
  const cached = getSession();
  if (
    !options?.force &&
    cached &&
    Date.now() - lastValidatedAt < SESSION_MAX_AGE_MS
  ) {
    return cached;
  }

  try {
    return await fetchMe();
  } catch {
    sessionCache.clear();
    lastValidatedAt = 0;
    return null;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<void>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function forgotPassword(
  email: string,
): Promise<{ resetToken?: string }> {
  return apiFetch<{ resetToken?: string }>("/auth/forgot-password", {
    method: "POST",
    skipAuth: true,
    body: { email },
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await apiFetch<void>("/auth/reset-password", {
    method: "POST",
    skipAuth: true,
    body: { token, password },
  });
}
