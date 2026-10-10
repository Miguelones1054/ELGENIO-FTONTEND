"use client";

import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import { useSiteConfig, type CoverVideo } from "@/components/SiteConfigProvider";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/youtube";
import styles from "@/styles/admin.module.css";

const defaultVideoConfig: CoverVideo = {
  enabled: false,
  sourceType: "direct",
  directUrl: "",
  youtubeUrl: "",
  title: "Video de Portada",
};

export function CoverVideoManager() {
  const { reload } = useSiteConfig();
  const [data, setData] = useState<CoverVideo>(defaultVideoConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const token = requireAdminToken();
        const res = await apiFetch<CoverVideo>("/administrative-content/cover-video", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res) {
          setData({
            enabled: Boolean(res.enabled),
            sourceType: res.sourceType === "youtube" ? "youtube" : "direct",
            directUrl: res.directUrl || "",
            youtubeUrl: res.youtubeUrl || "",
            title: res.title || "Video de Portada",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setToast({
            text: err instanceof Error ? err.message : "Error cargando la configuración",
            type: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 150 * 1024 * 1024) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`El video seleccionado (${file.name}) pesa ${sizeMb} MB. El tamaño máximo permitido es 150 MB.`, "error");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      showToast("Selecciona un archivo de video primero", "error");
      return;
    }

    setUploading(true);
    setToast(null);

    try {
      const token = requireAdminToken();
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await apiUpload<CoverVideo>("/administrative-content/cover-video/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showToast("¡Video subido y configurado con éxito!");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error subiendo el video", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setToast(null);

    try {
      const token = requireAdminToken();
      const res = await apiFetch<CoverVideo>("/administrative-content/cover-video", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      setData(res);
      showToast("¡Configuración del video de portada guardada con éxito!");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error guardando cambios", "error");
    } finally {
      setSaving(false);
    }
  }

  const youTubeId = extractYouTubeId(data.youtubeUrl);
  const isYouTubeValid = Boolean(youTubeId);
  const youTubePreviewUrl = isYouTubeValid ? getYouTubeEmbedUrl(data.youtubeUrl, false) : null;

  const hasVideoLoaded =
    data.sourceType === "direct" ? Boolean(data.directUrl) : Boolean(isYouTubeValid);

  if (loading) {
    return (
      <div className={styles.coverPanel}>
        <p className={styles.loading}>Cargando configuración del video de portada…</p>
      </div>
    );
  }

  return (
    <div className={styles.coverPanel}>
      <header className={styles.coverHeader}>
        <h2 className={styles.coverTitle}>Video de Portada (Popup Emergente)</h2>
        <p className={styles.coverDesc}>
          Muestra una ventana emergente interactiva en formato smartphone (celular) al entrar a la página
          principal (<code style={{ color: "#ff6a00" }}>elgenio.co</code>).
        </p>
      </header>

      {toast && (
        <div className={toast.type === "success" ? styles.toastSuccess : styles.toastError}>
          {toast.text}
        </div>
      )}

      <div className={styles.coverLayout}>
        {/* PANEL DE CONFIGURACIÓN */}
        <div className={styles.coverFormCard}>
          {/* Interruptor de activación */}
          <div className={styles.toggleRow}>
            <div className={styles.toggleLabelGroup}>
              <h3 className={styles.toggleTitle}>Mostrar video al abrir el sitio</h3>
              <p className={styles.toggleSubtitle}>
                {data.enabled
                  ? "El video se mostrará a los visitantes al ingresar al sitio web"
                  : "Desactivado: los visitantes entrarán directamente sin ventana emergente"}
              </p>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) => setData({ ...data, enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {/* Selector de modo */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Modo de video</label>
            <div className={styles.modeTabs} role="tablist">
              <button
                type="button"
                className={[styles.modeTab, data.sourceType === "direct" ? styles.modeTabActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setData({ ...data, sourceType: "direct" })}
              >
                📁 Subir video directo
              </button>
              <button
                type="button"
                className={[styles.modeTab, data.sourceType === "youtube" ? styles.modeTabActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setData({ ...data, sourceType: "youtube" })}
              >
                🔴 Enlace de YouTube
              </button>
            </div>
          </div>

          {/* CONTENIDO PARA MODO DIRECTO */}
          {data.sourceType === "direct" ? (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Archivo de video (MP4, WebM, MOV)</label>

              <div
                className={styles.uploadZone}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  className={styles.uploadIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className={styles.uploadPrompt}>
                  {selectedFile
                    ? `Archivo seleccionado: ${selectedFile.name}`
                    : "Haz clic para seleccionar o cambiar el archivo de video"}
                </p>
                <p className={styles.uploadHint}>Formatos recomendados: MP4 vertical (9:16) · Máximo 150MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
              </div>

              {selectedFile && (
                <button
                  type="button"
                  className={styles.submit}
                  style={{ width: "100%", marginBottom: 16 }}
                  disabled={uploading}
                  onClick={handleUpload}
                >
                  {uploading ? "Subiendo archivo al servidor…" : "Subir video y activar"}
                </button>
              )}

              <div className={styles.urlDivider}>
                <span>O ingresa una URL directa</span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>URL directa del video</label>
                <input
                  type="url"
                  className={styles.textInput}
                  placeholder="https://apiglitos.elgenio.co/media/cover-video/..."
                  value={data.directUrl}
                  onChange={(e) => setData({ ...data, directUrl: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          {/* CONTENIDO PARA MODO YOUTUBE */}
          {data.sourceType === "youtube" ? (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Enlace o URL de YouTube</label>
              <input
                type="url"
                className={styles.textInput}
                placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/... o Shorts"
                value={data.youtubeUrl}
                onChange={(e) => setData({ ...data, youtubeUrl: e.target.value })}
              />

              {data.youtubeUrl ? (
                isYouTubeValid ? (
                  <div className={styles.validBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Enlace de YouTube detectado correctamente (ID: {youTubeId})
                  </div>
                ) : (
                  <div className={styles.invalidBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    No se reconoció un enlace válido de YouTube
                  </div>
                )
              ) : (
                <p className={styles.fieldDesc} style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 6 }}>
                  Puedes pegar enlaces de YouTube estándar, enlaces cortos (youtu.be) o YouTube Shorts.
                </p>
              )}
            </div>
          ) : null}

          {/* BOTÓN GUARDAR */}
          <div className={styles.coverActions}>
            <button
              type="button"
              className={styles.saveBtn}
              disabled={saving || uploading}
              onClick={handleSave}
            >
              {saving ? "Guardando cambios…" : "Guardar cambios"}
            </button>
          </div>
        </div>

        {/* VISTA PREVIA INTERACTIVA (RECTANGULAR) */}
        <div className={styles.phonePreviewStage}>
          <div className={styles.phonePreviewTitle}>
            <span>Vista previa del Video</span>
            <span className={data.enabled ? styles.statusPillActive : styles.statusPillInactive}>
              {data.enabled ? "Activo" : "Desactivado"}
            </span>
          </div>

          <div className={styles.adminVideoFrame}>
            {/* Contenido del video */}
            {hasVideoLoaded ? (
              data.sourceType === "direct" && data.directUrl ? (
                <video
                  src={data.directUrl}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 14,
                  }}
                  controls
                  playsInline
                />
              ) : data.sourceType === "youtube" && youTubePreviewUrl ? (
                <iframe
                  src={youTubePreviewUrl}
                  title="Previsualización YouTube"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    borderRadius: 14,
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className={styles.adminEmptyVideo}>
                  <span>Sin video cargado</span>
                </div>
              )
            ) : (
              <div className={styles.adminEmptyVideo}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Sube un archivo o ingresa un enlace de YouTube para previsualizar</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
