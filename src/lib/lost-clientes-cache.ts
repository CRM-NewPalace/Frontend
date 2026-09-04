import { fetchLostClientes, type ApiLead } from "@/lib/leads-api";
import type { LostLead } from "@/lib/lost-leads-cache";
import { mapLostLead } from "@/lib/lost-leads-cache";

const CACHE_KEY = "crm_lost_clientes_cache_v1";

let memoryCache: LostLead[] | null = null;

function readSessionCache(): LostLead[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LostLead[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionCache(items: LostLead[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function getLostClientesCache(): LostLead[] | null {
  if (memoryCache) return memoryCache;
  const fromSession = readSessionCache();
  if (fromSession) {
    memoryCache = fromSession;
    return fromSession;
  }
  return null;
}

export function setLostClientesCache(items: LostLead[]) {
  memoryCache = items;
  writeSessionCache(items);
}

export function prependLostClienteToCache(api: ApiLead) {
  const item = mapLostLead(api);
  const current = getLostClientesCache() ?? [];
  setLostClientesCache([item, ...current.filter((l) => l.id !== item.id)]);
}

export function invalidateLostClientesCache() {
  memoryCache = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CACHE_KEY);
  }
}

export async function loadLostClientes(options?: {
  force?: boolean;
}): Promise<LostLead[]> {
  if (!options?.force) {
    const cached = getLostClientesCache();
    if (cached) return cached;
  }

  const pageSize = 200;
  const first = await fetchLostClientes({ page: 1, limit: pageSize });
  const all = [...first.data];
  const totalPages = Math.max(1, first.meta.totalPages);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetchLostClientes({ page: i + 2, limit: pageSize }),
      ),
    );
    for (const page of rest) all.push(...page.data);
  }

  const mapped = all.map(mapLostLead);
  setLostClientesCache(mapped);
  return mapped;
}
