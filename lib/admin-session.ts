const TOKEN_KEY = "elgenio.admin.token";
const USER_KEY = "elgenio.admin.user";
const REMEMBER_KEY = "elgenio.admin.remember";

export type AdminSessionUser = {
  uid: string;
  username: string;
};

function browserStorages(): Storage[] {
  return [window.localStorage, window.sessionStorage];
}

function tokenExpired(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return true;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const claims = JSON.parse(window.atob(padded)) as { exp?: number };
    if (!claims.exp) return false;
    return claims.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function readStoredToken(): string | null {
  for (const storage of browserStorages()) {
    const token = storage.getItem(TOKEN_KEY);
    if (!token) continue;
    if (tokenExpired(token)) {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
      continue;
    }
    return token;
  }
  return null;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return readStoredToken();
}

export function getAdminUser(): AdminSessionUser | null {
  if (typeof window === "undefined") return null;
  if (!readStoredToken()) return null;

  for (const storage of browserStorages()) {
    const raw = storage.getItem(USER_KEY);
    if (!raw) continue;

    try {
      return JSON.parse(raw) as AdminSessionUser;
    } catch {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
    }
  }

  return null;
}

export function isSessionRemembered(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(REMEMBER_KEY) === "1";
}

export function setAdminSession(token: string, user: AdminSessionUser, remember: boolean) {
  clearAdminSession();
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

export function clearAdminSession() {
  for (const storage of browserStorages()) {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
  }
}
