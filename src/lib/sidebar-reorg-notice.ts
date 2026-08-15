import { getSession } from "@/lib/auth";

export const SIDEBAR_REORG_NOTICE_KEY = "crm.sidebar-reorg-notice.v1";

function storageKey(userId: string) {
  return `${SIDEBAR_REORG_NOTICE_KEY}.${userId}`;
}

export function hasSeenSidebarReorgNotice(userId?: string | null): boolean {
  const id = userId ?? getSession()?.id;
  if (!id) return true;
  try {
    return localStorage.getItem(storageKey(id)) === "1";
  } catch {
    return true;
  }
}

export function markSidebarReorgNoticeSeen(userId?: string | null): void {
  const id = userId ?? getSession()?.id;
  if (!id) return;
  try {
    localStorage.setItem(storageKey(id), "1");
  } catch {
    // ignore quota / private mode
  }
}
