/**
 * Client HTTP do backend (NestJS).
 *
 * Autenticação via cookies httpOnly (JS não consegue ler o JWT — anti-XSS).
 * Mutações autenticadas enviam o header X-CSRF-Token (double-submit cookie).
 * credentials: "include" é obrigatório para o browser anexar os cookies.
 */

export const API_URL = import.meta.env.VITE_API_URL ?? "/api";

const USER_KEY = "crm_session_user";
const CSRF_COOKIE = "crm_csrf";
const CSRF_HEADER = "X-CSRF-Token";

/** Chaves antigas (JWT no localStorage) — removidas na migração anti-XSS. */
const LEGACY_TOKEN_KEYS = ["crm_access_token", "crm_refresh_token"] as const;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const isBrowser = () => typeof window !== "undefined";

function clearLegacyTokens() {
  if (!isBrowser()) return;
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

clearLegacyTokens();

/** Cache do perfil (não é segredo). Tokens ficam só em cookies httpOnly. */
export const sessionCache = {
  getUser: <T>(): T | null => {
    if (!isBrowser()) return null;
    const raw = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setUser: (user: unknown) => {
    if (!isBrowser()) return;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    // Remove o cache antigo do localStorage (migração).
    localStorage.removeItem(USER_KEY);
  },
  clear: () => {
    if (!isBrowser()) return;
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
    clearLegacyTokens();
  },
};

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

async function parseError(response: Response): Promise<string> {
  if (response.status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
  }

  try {
    const body = await response.json();
    const message = body?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  } catch {
    // resposta sem corpo JSON
  }
  return `Erro ${response.status} ao comunicar com o servidor.`;
}

/** Garante que várias requisições em paralelo disparem um único refresh. */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    sessionCache.clear();
    return false;
  }
  return true;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Rotas públicas não exigem CSRF (login, forgot-password...). */
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;

  const send = async (): Promise<Response> => {
    const csrf = skipAuth ? null : readCookie(CSRF_COOKIE);
    return fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  };

  let response = await send();

  if (response.status === 401 && !skipAuth) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      response = await send();
    }
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
