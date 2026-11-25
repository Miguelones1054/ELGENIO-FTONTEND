import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-session";
import { apiUrl } from "@/lib/env";

export type ProductionFileKind = "image" | "video";

export type ProductionFile = {
  id: string;
  kind: ProductionFileKind;
  originalName: string;
  mimeType: string;
  size: number;
  hasPreview: boolean;
  previewUrl: string;
  downloadUrl: string;
  streamUrl: string;
  createdAt: string;
};

export type AdminProduction = {
  id: string;
  reference: string;
  pin: string;
  description: string;
  files: ProductionFile[];
  createdAt: string;
  updatedAt: string;
};

export type ClientProduction = {
  id: string;
  reference: string;
  description: string;
  files: ProductionFile[];
  createdAt: string;
};

export type FileUploadStage = "queued" | "uploading" | "processing" | "done" | "error";

export type FileUploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  stage: FileUploadStage;
};

function requireAdminToken(): string {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  }
  return token;
}

export function generateRandomPin(): string {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return String(arr[0] % 10000).padStart(4, "0");
  }
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 1 : 2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function resolveProductionMediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return apiUrl(path);
}

export function detectProductionFileKind(file: File): ProductionFileKind | null {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (
    ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "tif", "tiff", "avif", "dng", "cr2", "cr3", "nef", "arw"].includes(
      ext,
    )
  ) {
    return "image";
  }
  if (["mp4", "mov", "m4v", "webm", "mkv", "avi", "qt", "3gp", "3g2", "mts", "m2ts", "mxf"].includes(ext)) {
    return "video";
  }
  return null;
}

export function buildDeliveryShareMessage(reference: string, pin: string): string {
  return `✨ ¡Gracias por confiar en El Genio!

Tu material ya está listo para descargar. Ingresa a **elgenio.co/entregas** y utiliza los siguientes datos para acceder:

🔐 Referencia: ${reference}
🔑 PIN de acceso: ${pin}

¡Esperamos que disfrutes tu material! 📸🎬`;
}

export async function listAdminProductions(): Promise<AdminProduction[]> {
  const token = requireAdminToken();
  const res = await apiFetch<{ productions: AdminProduction[] }>("/administrative-content/productions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.productions || [];
}

export async function createAdminProduction(input: {
  reference: string;
  pin: string;
  description: string;
}): Promise<AdminProduction> {
  const token = requireAdminToken();
  const res = await apiFetch<{ production: AdminProduction }>("/administrative-content/productions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return res.production;
}

export async function deleteAdminProduction(id: string): Promise<void> {
  const token = requireAdminToken();
  await apiFetch<{ deleted: boolean }>(`/administrative-content/productions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteAdminProductionFile(productionId: string, fileId: string): Promise<void> {
  const token = requireAdminToken();
  await apiFetch<{ deleted: boolean }>(
    `/administrative-content/productions/${encodeURIComponent(productionId)}/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

function sendChunkXhr(
  url: string,
  token: string,
  chunk: Blob,
  onChunkProgress: (loadedBytes: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onChunkProgress(Math.min(event.loaded, chunk.size));
      } else {
        onChunkProgress(Math.min(event.loaded, chunk.size));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onChunkProgress(chunk.size);
        resolve();
        return;
      }
      let message = `Error al subir fragmento (${xhr.status})`;
      if (xhr.responseText) {
        try {
          const parsed = JSON.parse(xhr.responseText) as { error?: string };
          if (parsed.error) message = parsed.error;
        } catch {
          // keep default message
        }
      }
      reject(new Error(message));
    };

    xhr.onerror = () => {
      reject(new Error("Error de red al subir el archivo. Verifica tu conexión."));
    };

    xhr.onabort = () => {
      reject(new Error("La subida fue cancelada."));
    };

    xhr.send(chunk);
  });
}

export async function uploadProductionFileWithProgress(
  productionId: string,
  file: File,
  onProgress: (progress: FileUploadProgress) => void,
): Promise<{ file: ProductionFile; production: AdminProduction }> {
  const token = requireAdminToken();
  const kind = detectProductionFileKind(file);
  if (!kind) {
    throw new Error(`Formato no compatible para "${file.name}". Usa fotos o videos.`);
  }

  onProgress({
    uploadedBytes: 0,
    totalBytes: file.size,
    percent: 0,
    stage: "uploading",
  });

  const init = await apiFetch<{ uploadId: string; chunkSize: number }>(
    `/administrative-content/productions/${encodeURIComponent(productionId)}/uploads/init`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || "",
        kind,
        size: file.size,
      }),
    },
  );

  const chunkSize = init.chunkSize || 8 * 1024 * 1024;
  const uploadId = init.uploadId;

  try {
    let offset = 0;
    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size);
      const chunk = file.slice(offset, end);
      const chunkUrl = apiUrl(
        `/administrative-content/productions/${encodeURIComponent(productionId)}/uploads/${encodeURIComponent(uploadId)}/chunk?offset=${offset}`,
      );

      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await sendChunkXhr(chunkUrl, token, chunk, (loadedInChunk) => {
            const uploadedBytes = Math.min(offset + loadedInChunk, file.size);
            const percent = file.size > 0 ? Math.min(99, Math.round((uploadedBytes / file.size) * 100)) : 100;
            onProgress({
              uploadedBytes,
              totalBytes: file.size,
              percent,
              stage: "uploading",
            });
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (lastErr) {
        throw lastErr;
      }

      offset = end;
    }

    onProgress({
      uploadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
      stage: "processing",
    });

    const completed = await apiFetch<{ file: ProductionFile; production: AdminProduction }>(
      `/administrative-content/productions/${encodeURIComponent(productionId)}/uploads/${encodeURIComponent(uploadId)}/complete`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    onProgress({
      uploadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
      stage: "done",
    });

    return completed;
  } catch (err) {
    // Limpiar archivo temporal en el servidor si falló
    apiFetch(
      `/administrative-content/productions/${encodeURIComponent(productionId)}/uploads/${encodeURIComponent(uploadId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    ).catch(() => {});
    throw err;
  }
}

export async function accessClientProduction(reference: string, pin: string): Promise<ClientProduction> {
  const res = await apiFetch<{ production: ClientProduction }>("/entregas/access", {
    method: "POST",
    body: JSON.stringify({
      reference: reference.trim(),
      pin: pin.trim(),
    }),
  });
  return res.production;
}
