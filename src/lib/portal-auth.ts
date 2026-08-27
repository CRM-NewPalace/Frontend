import {
  fetchPortalMe,
  portalLogin,
  portalLogout,
  portalSessionCache,
  storePortalCsrf,
  type PortalProprietario,
} from "@/lib/portal-api";

export function getPortalSession(): PortalProprietario | null {
  return portalSessionCache.get<PortalProprietario>();
}

export async function ensurePortalSession(): Promise<PortalProprietario | null> {
  try {
    const me = await fetchPortalMe();
    portalSessionCache.set(me);
    return me;
  } catch {
    portalSessionCache.clear();
    return null;
  }
}

export async function signInPortal(
  email: string,
  password: string,
  tenantSlug?: string,
) {
  const result = await portalLogin(email, password, tenantSlug);
  storePortalCsrf(result.csrfToken);
  portalSessionCache.set(result.proprietario);
  return result.proprietario;
}

export async function signOutPortal() {
  try {
    await portalLogout();
  } finally {
    portalSessionCache.clear();
  }
}
