export const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
export const isDev = appEnv === "development";
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

/**
 * Resuelve URLs de medios asegurando que en producción no apunten a localhost:8080
 * ni queden rotas si se crearon durante desarrollo local.
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // En producción (o cualquier host que no sea localhost): si viene localhost:8080/media/, reescribir al API público
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    if (
      trimmed.startsWith("http://localhost:8080/media/") ||
      trimmed.startsWith("http://127.0.0.1:8080/media/")
    ) {
      return trimmed.replace(
        /^http:\/\/(localhost|127\.0\.0\.1):8080\/media\//,
        "https://apiglitos.elgenio.co/media/",
      );
    }
  }

  // Si es una ruta relativa que empieza por /media/
  if (trimmed.startsWith("/media/")) {
    const base = apiBaseUrl || "https://apiglitos.elgenio.co";
    return `${base.replace(/\/+$/, "")}${trimmed}`;
  }

  return trimmed;
}
