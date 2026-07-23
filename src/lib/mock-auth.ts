// Client-side mock authentication (localStorage). No backend.
export type Role = "admin" | "gerente" | "corretor";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

const KEY = "crm_mock_session";

export const DEMO_USERS: Record<string, { password: string; user: MockUser }> = {
  "admin@imob.com": {
    password: "admin",
    user: { id: "u1", name: "Ana Souza", email: "admin@imob.com", role: "admin" },
  },
  "gerente@imob.com": {
    password: "gerente",
    user: { id: "u2", name: "Carlos Lima", email: "gerente@imob.com", role: "gerente" },
  },
  "corretor@imob.com": {
    password: "corretor",
    user: { id: "u3", name: "Marina Alves", email: "corretor@imob.com", role: "corretor" },
  },
};

export function getSession(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

export function signIn(email: string, password: string): MockUser | null {
  const rec = DEMO_USERS[email.toLowerCase().trim()];
  if (!rec || rec.password !== password) return null;
  window.localStorage.setItem(KEY, JSON.stringify(rec.user));
  return rec.user;
}

export function signOut() {
  window.localStorage.removeItem(KEY);
}
