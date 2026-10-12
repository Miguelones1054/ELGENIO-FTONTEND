"use client";

import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import { useSiteConfig, type PortfolioItem, type PortfolioMedia } from "@/components/SiteConfigProvider";
import { resolveMediaUrl } from "@/lib/env";
import { compressImageFile } from "@/lib/image-compress";
import { collectionWorks } from "@/lib/portfolio";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/admin.module.css";

const pageCopy = strings.pages.portafolio;

const portfolioCategories = pageCopy.categories;

type CoverForm = {
  imageUrl: string;
  headline: string;
  headlineFontSize: number;
  description: string;
  descriptionFontSize: number;
  fadeWidth: number;
  positionX: number;
  positionY: number;
};

const initialCover: CoverForm = {
  imageUrl: "",
  headline: pageCopy.headline,
  headlineFontSize: 46,
  description: pageCopy.copy,
  descriptionFontSize: 16,
  fadeWidth: 16,
  positionX: 72,
  positionY: 50,
};

type MediaDraft = {
  id: string;
  kind: "image" | "video";
  url: string;
  file?: File;
  preview?: string;
};

type FormState = {
  id?: string;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  hasButton: boolean;
  buttonText: string;
  buttonUrl: string;
  media: MediaDraft[];
};

const initialForm: FormState = {
  category: portfolioCategories[0],
  title: "",
  description: "",
  imageUrl: "",
  hasButton: false,
  buttonText: "Ver proyecto",
  buttonUrl: "",
  media: [],
};

function draftId() {
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function draftsFromItem(item: PortfolioItem): MediaDraft[] {
  return collectionWorks(item).map((piece) => ({
    id: piece.id,
    kind: piece.kind,
    url: piece.url,
  }));
}

export function PortfolioManager() {
  const { config, reload } = useSiteConfig();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Formulario de creación / edición
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const [cover, setCover] = useState<CoverForm>(initialCover);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewScale, setPreviewScale] = useState(1);
  const coverDragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    width: number;
    height: number;
  } | null>(null);
  const [coverDragging, setCoverDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverLoaded = useRef(false);
  const workImageRef = useRef<HTMLInputElement>(null);
  const workVideoRef = useRef<HTMLInputElement>(null);
  const [videoLink, setVideoLink] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      try {
        const token = requireAdminToken();
        const [data, coverData] = await Promise.all([
          apiFetch<PortfolioItem[]>("/administrative-content/portfolio", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<CoverForm>("/administrative-content/portfolio-cover", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
        ]);
        if (!cancelled && Array.isArray(data)) {
          setItems(data);
        }
        if (!cancelled && coverData && !coverLoaded.current) {
          coverLoaded.current = true;
          setCover({
            imageUrl: coverData.imageUrl || "",
            headline: coverData.headline || initialCover.headline,
            headlineFontSize: coverData.headlineFontSize || initialCover.headlineFontSize,
            description: coverData.description || initialCover.description,
            descriptionFontSize: coverData.descriptionFontSize || initialCover.descriptionFontSize,
            fadeWidth: coverData.fadeWidth ?? initialCover.fadeWidth,
            positionX: typeof coverData.positionX === "number" ? coverData.positionX : initialCover.positionX,
            positionY: typeof coverData.positionY === "number" ? coverData.positionY : initialCover.positionY,
          });
        }
      } catch (err) {
        if (!cancelled) {
          // Si falla o está vacío, fallback al config existente
          if (config?.portfolio) {
            setItems(config.portfolio);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPortfolio();
    return () => {
      cancelled = true;
    };
  }, [config?.portfolio]);

  async function saveCover(event: React.FormEvent) {
    event.preventDefault();
    if (!coverFile && !cover.imageUrl) {
      showToast("Sube la foto de la portada.", "error");
      return;
    }

    setSavingCover(true);
    try {
      let imageUrl = cover.imageUrl;
      if (coverFile) {
        imageUrl = await uploadPortfolioFile(coverFile, "image");
      }
      const token = requireAdminToken();
      const saved = await apiFetch<CoverForm>("/administrative-content/portfolio-cover", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...cover, imageUrl }),
      });
      setCover({
        imageUrl: saved.imageUrl || imageUrl,
        headline: saved.headline || cover.headline,
        headlineFontSize: saved.headlineFontSize || cover.headlineFontSize,
        description: saved.description || cover.description,
        descriptionFontSize: saved.descriptionFontSize || cover.descriptionFontSize,
        fadeWidth: typeof saved.fadeWidth === "number" ? saved.fadeWidth : cover.fadeWidth,
        positionX: typeof saved.positionX === "number" ? saved.positionX : cover.positionX,
        positionY: typeof saved.positionY === "number" ? saved.positionY : cover.positionY,
      });
      setCoverFile(null);
      setCoverPreview(null);
      showToast("Portada actualizada.");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo guardar la portada", "error");
    } finally {
      setSavingCover(false);
    }
  }

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(initialForm);
    setSelectedFile(null);
    setFilePreview(null);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditForm(item: PortfolioItem) {
    setEditingId(item.id);
    setForm({
      id: item.id,
      category: item.category || "",
      title: item.title || "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      hasButton: Boolean(item.hasButton),
      buttonText: item.buttonText || "Ver proyecto",
      buttonUrl: item.buttonUrl || "",
      media: draftsFromItem(item),
    });
    setSelectedFile(null);
    setFilePreview(null);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setSelectedFile(null);
    setFilePreview(null);
    setVideoLink("");
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast("Por favor selecciona un archivo de imagen (JPG, PNG, WebP o AVIF).", "error");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`La imagen pesa ${sizeMb} MB. El tamaño máximo permitido es 50 MB.`, "error");
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  }

  async function uploadPortfolioFile(file: File, kind: "image" | "video"): Promise<string> {
    const token = requireAdminToken();
    const payload =
      kind === "image"
        ? await compressImageFile(file, { maxDimension: 2400, quality: 0.86 })
        : file;
    const formData = new FormData();
    formData.append("file", payload);
    formData.append("kind", kind);
    const res = await apiUpload<{ url: string }>(
      "/administrative-content/portfolio/upload",
      formData,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.url;
  }

  async function uploadFileIfNeeded(): Promise<string> {
    if (!selectedFile) return form.imageUrl;
    return uploadPortfolioFile(selectedFile, "image");
  }

  function addWorkFiles(files: FileList | null, kind: "image" | "video") {
    if (!files?.length) return;
    const next = [...form.media];
    for (const file of Array.from(files)) {
      next.push({
        id: draftId(),
        kind,
        url: "",
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setForm({ ...form, media: next });
  }

  function addVideoLink() {
    const url = videoLink.trim();
    if (!url) return;
    setForm({
      ...form,
      media: [...form.media, { id: draftId(), kind: "video", url }],
    });
    setVideoLink("");
  }

  function removeWork(id: string) {
    setForm({ ...form, media: form.media.filter((piece) => piece.id !== id) });
  }

  function moveWork(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.media.length) return;
    const next = [...form.media];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    setForm({ ...form, media: next });
  }

  async function handleOptimizeServerImages() {
    setOptimizing(true);
    showToast("Comprimiendo y optimizando imágenes en el servidor... Por favor espera unos segundos.", "success");
    try {
      const token = requireAdminToken();
      const res = await apiFetch<{
        optimizedCount: number;
        originalBytes: number;
        optimizedBytes: number;
        savedBytes: number;
      }>("/administrative-content/portfolio/optimize-images", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.optimizedCount > 0) {
        const savedMb = (res.savedBytes / (1024 * 1024)).toFixed(1);
        const origMb = (res.originalBytes / (1024 * 1024)).toFixed(1);
        const newMb = (res.optimizedBytes / (1024 * 1024)).toFixed(1);
        showToast(`✓ Se optimizaron ${res.optimizedCount} fotos en el servidor. De ${origMb}MB a ${newMb}MB (Ahorro de ${savedMb}MB).`, "success");
      } else {
        showToast("Todas las imágenes del servidor ya están optimizadas y en máxima velocidad.", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error optimizando imágenes en servidor", "error");
    } finally {
      setOptimizing(false);
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      showToast("Escribe el nombre de la marca o del proyecto.", "error");
      return;
    }
    if (!selectedFile && !form.imageUrl && !form.media.some((piece) => piece.kind === "image" && (piece.file || piece.url))) {
      showToast("La colección necesita una imagen de portada.", "error");
      return;
    }
    if (form.media.length === 0) {
      showToast("Agrega al menos una foto o un video del trabajo.", "error");
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      setUploading(true);
      const uploadedMedia: PortfolioMedia[] = [];
      for (const piece of form.media) {
        const url = piece.file ? await uploadPortfolioFile(piece.file, piece.kind) : piece.url.trim();
        if (!url) continue;
        uploadedMedia.push({ id: piece.id, kind: piece.kind, url });
      }
      if (uploadedMedia.length === 0) {
        showToast("Agrega al menos una foto o un video del trabajo.", "error");
        return;
      }

      let finalImageUrl = await uploadFileIfNeeded();
      if (!finalImageUrl) {
        finalImageUrl = uploadedMedia.find((piece) => piece.kind === "image")?.url || "";
      }
      if (!finalImageUrl) {
        showToast("La colección necesita una imagen de portada.", "error");
        return;
      }

      const previous = editingId ? items.find((item) => item.id === editingId) : undefined;
      const itemToSave: PortfolioItem = {
        id: editingId || `port_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        category: form.category.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        imageUrl: finalImageUrl,
        media: uploadedMedia,
        hasButton: form.hasButton,
        buttonText: form.hasButton ? form.buttonText.trim() : "",
        buttonUrl: form.hasButton ? form.buttonUrl.trim() : "",
        createdAt: previous?.createdAt || new Date().toISOString(),
      };

      let updatedList: PortfolioItem[];
      if (editingId) {
        updatedList = items.map((it) => (it.id === editingId ? { ...it, ...itemToSave } : it));
      } else {
        updatedList = [itemToSave, ...items];
      }

      // Re-indexar order
      updatedList = updatedList.map((it, idx) => ({ ...it, order: idx }));

      // 3. Persistir en el servidor
      const token = requireAdminToken();
      const res = await apiFetch<PortfolioItem[]>("/administrative-content/portfolio", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedList),
      });

      setItems(res);
      showToast(editingId ? "Colección actualizada." : "Colección publicada.");
      closeForm();
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error guardando la foto", "error");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDeleteItem(item: PortfolioItem) {
    const confirmName = item.title ? `"${item.title}"` : "esta colección";
    if (!window.confirm(`¿Eliminar ${confirmName} y todos sus trabajos? Esta acción borra los archivos del servidor.`)) {
      return;
    }

    setSaving(true);
    try {
      const updatedList = items
        .filter((it) => it.id !== item.id)
        .map((it, idx) => ({ ...it, order: idx }));

      const token = requireAdminToken();
      const res = await apiFetch<PortfolioItem[]>("/administrative-content/portfolio", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedList),
      });

      setItems(res);
      showToast("Colección eliminada");
      if (editingId === item.id) {
        closeForm();
      }
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error eliminando la foto", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const updatedList = copy.map((it, idx) => ({ ...it, order: idx }));
    setItems(updatedList);

    try {
      const token = requireAdminToken();
      await apiFetch<PortfolioItem[]>("/administrative-content/portfolio", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedList),
      });
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error reordenando fotos", "error");
    }
  }

  function handleCoverPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!coverPreview && !cover.imageUrl) return;
    const rect = event.currentTarget.getBoundingClientRect();
    coverDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      initialX: cover.positionX,
      initialY: cover.positionY,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setCoverDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCoverPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = coverDragRef.current;
    if (!drag) return;
    const dx = ((event.clientX - drag.startX) / drag.width) * 100;
    const dy = ((event.clientY - drag.startY) / drag.height) * 100;
    const positionX = Math.round(Math.max(0, Math.min(100, drag.initialX - dx)));
    const positionY = Math.round(Math.max(0, Math.min(100, drag.initialY - dy)));
    setCover((current) => ({ ...current, positionX, positionY }));
  }

  function handleCoverPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!coverDragRef.current) return;
    coverDragRef.current = null;
    setCoverDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const previewWidth = previewMode === "mobile" ? 390 : 1280;
  const previewHeight = previewMode === "mobile" ? 844 : 900;

  function previewCollections(): PortfolioItem[] {
    const published = items.map((item) => ({
      ...item,
      media: (item.media || []).map((piece) => ({
        id: piece.id,
        kind: piece.kind,
        url: piece.url,
      })),
    }));
    if (!formOpen) return published;

    const draftItem: PortfolioItem = {
      id: editingId || "borrador",
      category: form.category,
      title: form.title,
      description: form.description,
      imageUrl: filePreview || form.imageUrl,
      media: form.media.map((piece) => ({
        id: piece.id,
        kind: piece.kind,
        url: piece.preview || piece.url,
      })),
      hasButton: form.hasButton,
      buttonText: form.buttonText,
      buttonUrl: form.buttonUrl,
      order: editingId ? published.find((item) => item.id === editingId)?.order ?? published.length : published.length,
    };

    if (editingId) {
      return published.map((item) => (item.id === editingId ? draftItem : item));
    }
    return [...published, draftItem];
  }

  function pushPreview() {
    const frame = previewFrameRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(
      {
        type: "portfolio-draft",
        payload: {
          cover: {
            imageUrl: coverPreview || cover.imageUrl,
            headline: cover.headline,
            headlineFontSize: cover.headlineFontSize,
            description: cover.description,
            descriptionFontSize: cover.descriptionFontSize,
            fadeWidth: cover.fadeWidth,
            positionX: cover.positionX,
            positionY: cover.positionY,
          },
          items: previewCollections(),
        },
      },
      window.location.origin,
    );
  }

  useEffect(() => {
    const stage = previewStageRef.current;
    if (!stage) return;
    const update = () => {
      const available = stage.clientWidth;
      setPreviewScale(available > 0 ? Math.min(1, available / previewWidth) : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [previewWidth, loading]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "portfolio-preview-ready") return;
      pushPreview();
    }
    window.addEventListener("message", onMessage);
    pushPreview();
    return () => window.removeEventListener("message", onMessage);
  });

  if (loading) {
    return (
      <div className={styles.coverPanel}>
        <p className={styles.loading}>Cargando portafolio…</p>
      </div>
    );
  }

  return (
    <div className={styles.portfolioPanel}>
      {/* CABECERA */}
      <header className={styles.portfolioHeader}>
        <div>
          <div className={styles.portfolioTitleRow}>
            <h2 className={styles.coverTitle}>Portafolio</h2>
            <span className={styles.portfolioCounterBadge}>
              {items.length} {items.length === 1 ? "colección" : "colecciones"}
            </span>
          </div>
          <p className={styles.coverDesc}>
            La portada es la foto grande de arriba. Debajo se crean las colecciones de cada marca.
          </p>
        </div>

        {!formOpen && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className={styles.secondaryAction}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
              onClick={handleOptimizeServerImages}
              disabled={optimizing}
              title="Comprime todas las fotos existentes en el servidor sin perder calidad"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              {optimizing ? "Optimizando servidor..." : "Comprimir fotos del servidor"}
            </button>
            <button
              type="button"
              className={styles.editorPrimary}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
              onClick={openCreateForm}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva colección
            </button>
          </div>
        )}
      </header>

      {/* FEEDBACK TOAST */}
      {toast && (
        <div className={toast.type === "success" ? styles.toastSuccess : styles.toastError}>
          {toast.text}
        </div>
      )}

      {/* FORMULARIO AGREGAR / EDITAR */}
      <section className={styles.portfolioFormCard} aria-labelledby="coverTitle">
        <form onSubmit={saveCover}>
          <div className={styles.portfolioFormHeader}>
            <h3 id="coverTitle" className={styles.portfolioFormTitle}>
              Portada de la página
            </h3>
          </div>
          <div className={styles.portfolioFormGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Foto de portada</label>
              {coverPreview || cover.imageUrl ? (
                <div
                  className={coverDragging ? styles.coverFrameDragging : styles.coverFrame}
                  onPointerDown={handleCoverPointerDown}
                  onPointerMove={handleCoverPointerMove}
                  onPointerUp={handleCoverPointerUp}
                  onPointerCancel={handleCoverPointerUp}
                >
                  <img
                    src={coverPreview || resolveMediaUrl(cover.imageUrl)}
                    alt=""
                    className={styles.coverFrameImage}
                    style={{ objectPosition: `${cover.positionX}% ${cover.positionY}%` }}
                    draggable={false}
                  />
                  <span className={styles.coverFrameHint}>
                    {coverDragging ? "Soltar para dejar el encuadre" : "Mantén el clic y arrastra la foto"}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.portfolioImageUploadPreview}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <span style={{ color: "#94a3b8", padding: 24 }}>Sube la foto de la portada</span>
                </button>
              )}
              {coverPreview || cover.imageUrl ? (
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => coverInputRef.current?.click()}
                >
                  Cambiar foto
                </button>
              ) : null}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setCoverPreview((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return URL.createObjectURL(file);
                  });
                  setCoverFile(file);
                }}
              />
            </div>
            <div className={styles.portfolioFormDetails}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="cover-headline">
                  Filas del título
                </label>
                <textarea
                  id="cover-headline"
                  className={styles.textInput}
                  rows={3}
                  value={cover.headline}
                  onChange={(event) => setCover({ ...cover, headline: event.target.value })}
                />
                <p className={styles.toggleSubtitle}>Cada línea es una fila del título.</p>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="cover-headline-size">
                  Tamaño del título: {cover.headlineFontSize}px
                </label>
                <input
                  id="cover-headline-size"
                  type="range"
                  min={28}
                  max={72}
                  step={1}
                  value={cover.headlineFontSize}
                  onChange={(event) =>
                    setCover({ ...cover, headlineFontSize: Number(event.target.value) })
                  }
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="cover-description">
                  Texto inferior
                </label>
                <textarea
                  id="cover-description"
                  className={styles.textInput}
                  rows={3}
                  value={cover.description}
                  onChange={(event) => setCover({ ...cover, description: event.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="cover-description-size">
                  Tamaño del texto inferior: {cover.descriptionFontSize}px
                </label>
                <input
                  id="cover-description-size"
                  type="range"
                  min={12}
                  max={32}
                  step={1}
                  value={cover.descriptionFontSize}
                  onChange={(event) =>
                    setCover({ ...cover, descriptionFontSize: Number(event.target.value) })
                  }
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="cover-fade">
                  Degradado blanco: {cover.fadeWidth}%
                </label>
                <input
                  id="cover-fade"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={cover.fadeWidth}
                  onChange={(event) => setCover({ ...cover, fadeWidth: Number(event.target.value) })}
                />
                <p className={styles.toggleSubtitle}>Hasta dónde llega el blanco sobre la foto, desde la izquierda. 100% la cubre por completo.</p>
              </div>
            </div>
          </div>
          <div className={styles.portfolioFormActions}>
            <button type="submit" className={styles.editorPrimary} disabled={savingCover}>
              {savingCover ? "Guardando portada..." : "Guardar portada"}
            </button>
          </div>
        </form>
      </section>

      {formOpen && (
        <section className={styles.portfolioFormCard} aria-labelledby="formTitle">
          <div className={styles.portfolioFormHeader}>
            <h3 id="formTitle" className={styles.portfolioFormTitle}>
              {editingId ? "Editar colección" : "Nueva colección"}
            </h3>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={closeForm}
              disabled={saving || uploading}
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={handleSaveItem}>
            <div className={styles.portfolioFormGrid}>
              {/* COLUMNA IZQUIERDA: FOTO */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Portada de la colección <span style={{ color: "#ff6a00" }}>*</span>
                </label>

                <div
                  className={styles.uploadZone}
                  style={{ minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "center" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {filePreview || form.imageUrl ? (
                    <div className={styles.portfolioImageUploadPreview}>
                      <img
                        src={filePreview || resolveMediaUrl(form.imageUrl)}
                        alt="Vista previa"
                        className={styles.portfolioPreviewImg}
                      />
                      <div className={styles.portfolioUploadOverlay}>
                        <span>Haz clic para cambiar imagen</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <svg
                        className={styles.uploadIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <p className={styles.uploadPrompt}>
                        {selectedFile
                          ? `Archivo: ${selectedFile.name}`
                          : "Selecciona o arrastra una fotografía"}
                      </p>
                      <p className={styles.uploadHint}>JPG, PNG, WebP o AVIF en alta resolución · Máx. 50MB</p>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                </div>

                {selectedFile && (
                  <p style={{ fontSize: "0.8rem", color: "#10b981", margin: "6px 0 0", fontWeight: 600 }}>
                    ✓ Archivo listo para subirse al guardar ({selectedFile.name})
                  </p>
                )}
              </div>

              {/* COLUMNA DERECHA: DATOS DEL PROYECTO */}
              <div className={styles.portfolioFormDetails}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="portfolio-category">
                    Categoría
                  </label>
                  <input
                    id="portfolio-category"
                    type="text"
                    className={styles.textInput}
                    list="portfolio-categories"
                    placeholder="ej. Turismo"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                  <datalist id="portfolio-categories">
                    {portfolioCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Marca o proyecto</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="ej. Café Montaña"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Descripción</label>
                  <textarea
                    className={styles.textInput}
                    rows={4}
                    placeholder="Qué se hizo para esta marca..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                {/* INTERRUPTOR BOTÓN DE ACCIÓN */}
                <div className={styles.portfolioButtonToggleBox}>
                  <div className={styles.toggleRow} style={{ paddingBottom: 12, marginBottom: 12 }}>
                    <div className={styles.toggleLabelGroup}>
                      <h4 className={styles.toggleTitle} style={{ fontSize: "0.95rem" }}>
                        Incluir botón de acción
                      </h4>
                      <p className={styles.toggleSubtitle}>
                        Muestra un botón interactivo (ej. &quot;Ver proyecto&quot;, enlace a Instagram, WhatsApp o página web)
                      </p>
                    </div>
                    <label className={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        checked={form.hasButton}
                        onChange={(e) => setForm({ ...form, hasButton: e.target.checked })}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>

                  {form.hasButton && (
                    <div className={styles.portfolioButtonFields}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Texto del botón</label>
                        <input
                          type="text"
                          className={styles.textInput}
                          placeholder="ej. Ver proyecto completo, Contactar, Ver en Instagram"
                          value={form.buttonText}
                          onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                          required={form.hasButton}
                        />
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Enlace / URL de destino</label>
                        <input
                          type="text"
                          className={styles.textInput}
                          placeholder="ej. https://instagram.com/p/... o /contacto"
                          value={form.buttonUrl}
                          onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                          required={form.hasButton}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.portfolioMediaBlock}>
              <label className={styles.fieldLabel}>Trabajos de la marca</label>
              <p className={styles.toggleSubtitle}>
                Estas fotos y videos se abren en carrusel al oprimir la tarjeta.
              </p>
              <div className={styles.portfolioMediaActions}>
                <button type="button" className={styles.secondaryAction} onClick={() => workImageRef.current?.click()}>
                  Agregar fotos
                </button>
                <button type="button" className={styles.secondaryAction} onClick={() => workVideoRef.current?.click()}>
                  Agregar videos
                </button>
                <input
                  ref={workImageRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  multiple
                  hidden
                  onChange={(event) => {
                    addWorkFiles(event.target.files, "image");
                    event.target.value = "";
                  }}
                />
                <input
                  ref={workVideoRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  multiple
                  hidden
                  onChange={(event) => {
                    addWorkFiles(event.target.files, "video");
                    event.target.value = "";
                  }}
                />
              </div>
              <div className={styles.portfolioMediaActions}>
                <input
                  type="url"
                  className={styles.textInput}
                  placeholder="O pega un enlace de YouTube o de un video"
                  value={videoLink}
                  onChange={(event) => setVideoLink(event.target.value)}
                />
                <button type="button" className={styles.secondaryAction} onClick={addVideoLink}>
                  Agregar enlace
                </button>
              </div>

              {form.media.length > 0 ? (
                <div className={styles.portfolioMediaList}>
                  {form.media.map((piece, index) => (
                    <div key={piece.id} className={styles.portfolioMediaRow}>
                      {piece.kind === "image" ? (
                        <img
                          src={piece.preview || resolveMediaUrl(piece.url)}
                          alt=""
                          className={styles.portfolioMediaThumb}
                        />
                      ) : (
                        <div className={styles.portfolioMediaVideoMark}>Video</div>
                      )}
                      <div className={styles.portfolioMediaMeta}>
                        <strong>{piece.kind === "video" ? "Video" : "Foto"} {index + 1}</strong>
                        <span>{piece.file?.name || piece.url || "Pendiente de subir"}</span>
                      </div>
                      <div className={styles.portfolioMediaRowActions}>
                        <button type="button" className={styles.portfolioOrderBtn} disabled={index === 0} onClick={() => moveWork(index, -1)} aria-label="Mover antes">
                          ▲
                        </button>
                        <button type="button" className={styles.portfolioOrderBtn} disabled={index === form.media.length - 1} onClick={() => moveWork(index, 1)} aria-label="Mover después">
                          ▼
                        </button>
                        {piece.kind === "image" && piece.url ? (
                          <button
                            type="button"
                            className={styles.secondaryAction}
                            onClick={() => {
                              setSelectedFile(null);
                              setFilePreview(null);
                              setForm({ ...form, imageUrl: piece.url });
                            }}
                          >
                            Portada
                          </button>
                        ) : null}
                        <button type="button" className={styles.portfolioDeleteBtn} onClick={() => removeWork(piece.id)}>
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.uploadHint}>Todavía no hay trabajos en esta colección.</p>
              )}
            </div>

            {/* BOTONES DE ACCIÓN DEL FORMULARIO */}
            <div className={styles.portfolioFormActions}>
              <button
                type="submit"
                className={styles.submit}
                disabled={saving || uploading}
              >
                {uploading
                  ? "Subiendo trabajos…"
                  : saving
                    ? "Guardando colección…"
                    : editingId
                      ? "Actualizar colección"
                      : "Publicar colección"}
              </button>

              <button
                type="button"
                className={styles.secondaryAction}
                onClick={closeForm}
                disabled={saving || uploading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* LISTA DE FOTOS PUBLICADAS */}
      <section className={styles.portfolioListSection} aria-label="Fotos del portafolio">
        {items.length === 0 ? (
          <div className={styles.portfolioEmptyBox}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h3 style={{ margin: "14px 0 6px", fontSize: "1.1rem", color: "#334155" }}>
              Aún no hay colecciones
            </h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Crea una colección por marca y agrega las fotos o videos de ese trabajo.
            </p>
            <button
              type="button"
              className={styles.editorPrimary}
              style={{ marginTop: 18 }}
              onClick={openCreateForm}
            >
              + Nueva colección
            </button>
          </div>
        ) : (
          <div className={styles.portfolioAdminGrid}>
            {items.map((item, index) => (
              <article key={item.id} className={styles.portfolioAdminCard}>
                <div className={styles.portfolioAdminThumbWrap}>
                  <img
                    src={resolveMediaUrl(item.imageUrl)}
                    alt={item.title || "Foto de portafolio"}
                    className={styles.portfolioAdminThumb}
                    loading="lazy"
                  />
                  <div className={styles.portfolioCardOrderBadge}>#{index + 1}</div>
                  {item.hasButton && (
                    <div className={styles.portfolioHasButtonBadge} title={`Botón: ${item.buttonText} (${item.buttonUrl})`}>
                      🔗 Con botón
                    </div>
                  )}
                </div>

                <div className={styles.portfolioAdminCardContent}>
                  {item.category?.trim() ? (
                    <p className={styles.portfolioAdminCategory}>{item.category}</p>
                  ) : null}
                  <h4 className={styles.portfolioAdminCardTitle}>
                    {item.title || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sin título</span>}
                  </h4>
                  <p className={styles.portfolioAdminCardDesc}>
                    {collectionWorks(item).length}{" "}
                    {collectionWorks(item).length === 1 ? "trabajo" : "trabajos"}
                    {item.description ? ` · ${item.description}` : ""}
                  </p>

                  {item.hasButton && item.buttonText && (
                    <div className={styles.portfolioAdminButtonPreview}>
                      <span className={styles.portfolioAdminPill}>
                        {item.buttonText} ↗
                      </span>
                      <span className={styles.portfolioAdminUrlPreview} title={item.buttonUrl}>
                        {item.buttonUrl || "Sin URL"}
                      </span>
                    </div>
                  )}

                  {/* BARRA DE HERRAMIENTAS / ACCIONES */}
                  <div className={styles.portfolioAdminCardActions}>
                    <div className={styles.portfolioReorderGroup}>
                      <button
                        type="button"
                        className={styles.portfolioOrderBtn}
                        disabled={index === 0 || saving}
                        onClick={() => handleMove(index, "up")}
                        title="Subir posición"
                        aria-label="Subir posición"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className={styles.portfolioOrderBtn}
                        disabled={index === items.length - 1 || saving}
                        onClick={() => handleMove(index, "down")}
                        title="Bajar posición"
                        aria-label="Bajar posición"
                      >
                        ▼
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className={styles.portfolioEditBtn}
                        onClick={() => openEditForm(item)}
                        disabled={saving}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={styles.portfolioDeleteBtn}
                        onClick={() => handleDeleteItem(item)}
                        disabled={saving}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.portfolioPreview} aria-label="Vista previa de la página">
        <div className={styles.portfolioPreviewHeader}>
          <div>
            <h2 className={styles.portfolioPreviewTitle}>Vista previa</h2>
            <p className={styles.portfolioPreviewCopy}>
              Así se verá la página con lo que está en esta pantalla, antes de guardarlo.
            </p>
          </div>
          <div className={styles.viewportToggle} role="group" aria-label="Modo de vista previa">
            <button
              type="button"
              className={[styles.viewportBtn, previewMode === "desktop" ? styles.viewportBtnActive : ""].filter(Boolean).join(" ")}
              onClick={() => setPreviewMode("desktop")}
            >
              Escritorio
            </button>
            <button
              type="button"
              className={[styles.viewportBtn, previewMode === "mobile" ? styles.viewportBtnActive : ""].filter(Boolean).join(" ")}
              onClick={() => setPreviewMode("mobile")}
            >
              Móvil
            </button>
          </div>
        </div>
        <div
          ref={previewStageRef}
          className={styles.portfolioPreviewStage}
          style={{ height: Math.round(previewHeight * previewScale) }}
        >
          <div
            className={styles.portfolioPreviewScaler}
            style={{
              width: previewWidth,
              height: previewHeight,
              transform: `scale(${previewScale})`,
            }}
          >
            <iframe
              ref={previewFrameRef}
              className={styles.portfolioPreviewFrame}
              title="Vista previa del portafolio"
              src="/portafolio?vista=borrador"
              style={{ width: previewWidth, height: previewHeight }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
