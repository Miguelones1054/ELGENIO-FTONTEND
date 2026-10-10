import { apiFetch } from "@/lib/api";
import {
  clearAdminSession,
  getAdminToken,
  setAdminSession,
  type AdminSessionUser,
} from "@/lib/admin-session";

type SignInResponse = {
  token: string;
};

type ValidateSignUserResponse = {
  uid: string;
  username: string;
};

export async function adminSignIn(username: string, password: string): Promise<AdminSessionUser> {
  const { token } = await apiFetch<SignInResponse>("/administrative-content/sign-in", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  const profile = await apiFetch<ValidateSignUserResponse>("/validate-sign-user", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const user: AdminSessionUser = {
    uid: profile.uid,
    username: profile.username,
  };

  setAdminSession(token, user);
  return user;
}

export function adminSignOut() {
  clearAdminSession();
}

export function requireAdminToken(): string {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Sesión no encontrada");
  }
  return token;
}
