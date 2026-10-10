const TOKEN_KEY = "elgenio.admin.token";
const USER_KEY = "elgenio.admin.user";

export type AdminSessionUser = {
  uid: string;
  username: string;
};

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): AdminSessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminSessionUser;
  } catch {
    return null;
  }
}

export function setAdminSession(token: string, user: AdminSessionUser) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}
