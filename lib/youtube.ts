/**
 * Extrae el Video ID de YouTube desde múltiples formatos de URL:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - dQw4w9WgXcQ (ID directo)
 */
export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Si pasaron solo el ID de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex universal de YouTube
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Retorna la URL de inserción segura (iframe) optimizada para celular vertical
 */
export function getYouTubeEmbedUrl(urlOrId: string | undefined | null, autoPlay = true): string | null {
  const id = extractYouTubeId(urlOrId);
  if (!id) return null;

  const params = new URLSearchParams({
    autoplay: autoPlay ? "1" : "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
    origin: typeof window !== "undefined" ? window.location.origin : "https://elgenio.co",
  });

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
