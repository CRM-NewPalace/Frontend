/**
 * Client HTTP do backend (NestJS).
 *
 * Autenticação via cookies httpOnly (JS não consegue ler o JWT — anti-XSS).
 * Mutações autenticadas enviam o header X-CSRF-Token (double-submit cookie).
 * credentials: "include" é obrigatório para o browser anexar os cookies.
 *
 * A URL da API no browser é SEMPRE same-origin `/api`:
 * - Dev: proxy do Vite → Nest
 * - Prod (Vercel): rewrite em vercel.json → Render
 * Apontar VITE_API_URL para o domínio do Render torna o cookie third-party
 * (Firefox/Chrome bloqueiam → 401 em /auth/me após login).
 */

function resolveApiUrl(): string {
  const configured = (
    import.meta.env.VITE_API_URL as string | undefined
  )?.trim();
  if (!configured || configured === "/api") return "/api";

  // Absolute URL só é segura em SSR/server; no browser força same-origin.
  if (typeof window !== "undefined") {
    return "/api";
  }

  return configured;
}

export const API_URL = resolveApiUrl();

const USER_KEY = "crm_session_user";
const CSRF_COOKIE = "crm_csrf";
const CSRF_STORAGE_KEY = "crm_csrf_token";
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

/** Cache do perfil (não é segredo). Tokens JWT ficam só em cookies httpOnly. */
export const sessionCache = {
  getUser: <T>(): T | null => {
    if (!isBrowser()) return null;
    const raw =
      sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
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
    localStorage.removeItem(USER_KEY);
  },
  clear: () => {
    if (!isBrowser()) return;
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
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

/** Cookie same-origin ou token salvo no sessionStorage (cross-origin Vercel→Render). */
function readCsrfToken(): string | null {
  return (
    readCookie(CSRF_COOKIE) ??
    (isBrowser() ? sessionStorage.getItem(CSRF_STORAGE_KEY) : null)
  );
}

export function storeCsrfToken(token: string | null | undefined) {
  if (!isBrowser()) return;
  if (!token) {
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(CSRF_STORAGE_KEY, token);
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
  try {
    const body = (await response.json()) as { csrfToken?: string };
    storeCsrfToken(body.csrfToken);
  } catch {
    // ok
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
  const method = (rest.method ?? "GET").toString().toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  const send = async (): Promise<Response> => {
    const csrf = skipAuth ? null : readCsrfToken();
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

  // Mutações sem CSRF no jar → renova sessão antes (evita 403 intermitente).
  if (!skipAuth && isMutation && !readCsrfToken()) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    await refreshInFlight;
  }

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

  // 403 em mutação: renova CSRF/sessão e tenta uma vez (CSRF desatualizado ou sessão parcial).
  if (response.status === 403 && !skipAuth && isMutation) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      response = await send();
    }
  }

  if (!response.ok) {
    // Sessão morta (cookie ausente/expirado): limpa cache e manda pro login.
    if (response.status === 401 && !skipAuth) {
      sessionCache.clear();
      if (isBrowser() && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
