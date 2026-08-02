/** Permite ver a landing em `/` após "Voltar ao site" no login. */
export const MARKETING_HOME_FLAG = "crm_marketing_home_v1";

export function allowMarketingHome() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MARKETING_HOME_FLAG, "1");
}

export function clearMarketingHome() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MARKETING_HOME_FLAG);
}

export function hasMarketingHomeAccess() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(MARKETING_HOME_FLAG) === "1";
}
