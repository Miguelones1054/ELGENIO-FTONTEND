import { apiUrl } from "@/lib/env";

export type ApiErrorBody = {
  error?: string;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  const text = await response.text();
  let data = {} as T & ApiErrorBody;

  if (text) {
    try {
      data = JSON.parse(text) as T & ApiErrorBody;
    } catch {
      throw new Error(
        response.ok
          ? "Respuesta inválida del servidor"
          : `Error del servidor (${response.status})`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Error del servidor (${response.status})`);
  }

  return data;
}

export async function apiUpload<T>(path: string, formData: FormData, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // Leave Content-Type unset so the browser sets multipart boundary.
  headers.delete("Content-Type");

  const response = await fetch(apiUrl(path), {
    ...init,
    method: init.method || "POST",
    headers,
    body: formData,
  });

  if (response.status === 413) {
    throw new Error("El archivo es demasiado pesado para subirlo. Usa un video de menos de 90 MB o pega un enlace de YouTube.");
  }

  const text = await response.text();
  let data = {} as T & ApiErrorBody;

  if (text) {
    try {
      data = JSON.parse(text) as T & ApiErrorBody;
    } catch {
      throw new Error(
        response.ok
          ? "Respuesta inválida del servidor"
          : `Error del servidor (${response.status})`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Error del servidor (${response.status})`);
  }

  return data;
}
