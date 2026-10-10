"use client";

import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import { useSiteConfig, type PortfolioItem } from "@/components/SiteConfigProvider";
import { resolveMediaUrl } from "@/lib/env";
import { compressImageFile } from "@/lib/image-compress";
import styles from "@/styles/admin.module.css";

type FormState = {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  hasButton: boolean;
  buttonText: string;
  buttonUrl: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  imageUrl: "",
  hasButton: false,
  buttonText: "Ver proyecto",
  buttonUrl: "",
};

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<PortfolioItem[]>("/administrative-content/portfolio", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && Array.isArray(data)) {
          setItems(data);
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
      title: item.title || "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      hasButton: Boolean(item.hasButton),
      buttonText: item.buttonText || "Ver proyecto",
      buttonUrl: item.buttonUrl || "",
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

  async function uploadFileIfNeeded(): Promise<string> {
    if (!selectedFile) {
      return form.imageUrl;
    }

    setUploading(true);
    try {
      const token = requireAdminToken();

      // Comprimir automáticamente la foto antes de subir para máxima velocidad
      const compressed = await compressImageFile(selectedFile, {
        maxDimension: 2400,
        quality: 0.86,
      });

      const formData = new FormData();
      formData.append("file", compressed);
      if (form.imageUrl) {
        formData.append("oldUrl", form.imageUrl);
      }

      const res = await apiUpload<{ url: string }>(
        "/administrative-content/portfolio/upload",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return res.url;
    } finally {
      setUploading(false);
    }
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

    if (!selectedFile && !form.imageUrl) {
      showToast("Debes seleccionar una imagen para la foto del portafolio.", "error");
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      // 1. Subir imagen si se seleccionó archivo nuevo
      const finalImageUrl = await uploadFileIfNeeded();

      // 2. Construir el nuevo item
      const itemToSave: PortfolioItem = {
        id: editingId || `port_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: form.title.trim(),
        description: form.description.trim(),
        imageUrl: finalImageUrl,
        hasButton: form.hasButton,
        buttonText: form.hasButton ? form.buttonText.trim() : "",
        buttonUrl: form.hasButton ? form.buttonUrl.trim() : "",
        createdAt: new Date().toISOString(),
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
      showToast(editingId ? "¡Foto actualizada con éxito!" : "¡Foto agregada al portafolio!");
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
    const confirmName = item.title ? `"${item.title}"` : "esta foto";
    if (!window.confirm(`¿Estás seguro de eliminar ${confirmName} del portafolio? Esta acción borrará el archivo del servidor.`)) {
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
      showToast("Foto eliminada del portafolio");
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
            <h2 className={styles.coverTitle}>Portafolio Fotográfico y Proyectos</h2>
            <span className={styles.portfolioCounterBadge}>
              {items.length} {items.length === 1 ? "foto / proyecto" : "fotos / proyectos"}
            </span>
          </div>
          <p className={styles.coverDesc}>
            Administra las fotos que se muestran en <code style={{ color: "#ff6a00" }}>/portafolio</code>.
            Cada foto puede tener título, descripción y un botón de acción opcional con enlace personalizado.
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
              Agregar foto al portafolio
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
      {formOpen && (
        <section className={styles.portfolioFormCard} aria-labelledby="formTitle">
          <div className={styles.portfolioFormHeader}>
            <h3 id="formTitle" className={styles.portfolioFormTitle}>
              {editingId ? "Editar foto del portafolio" : "Nueva foto para el portafolio"}
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
                  Foto del proyecto <span style={{ color: "#ff6a00" }}>*</span>
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
                  <label className={styles.fieldLabel}>Título del proyecto / fotografía</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="ej. Campaña Publicitaria 'Luz & Sombra'"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Descripción</label>
                  <textarea
                    className={styles.textInput}
                    rows={4}
                    placeholder="Breve descripción del concepto, producción o resultado del trabajo..."
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

            {/* BOTONES DE ACCIÓN DEL FORMULARIO */}
            <div className={styles.portfolioFormActions}>
              <button
                type="submit"
                className={styles.submit}
                disabled={saving || uploading}
              >
                {uploading
                  ? "Subiendo imagen al servidor…"
                  : saving
                    ? "Guardando cambios…"
                    : editingId
                      ? "Actualizar foto"
                      : "Publicar en portafolio"}
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
              Aún no has agregado fotos al portafolio
            </h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Haz clic en &quot;Agregar foto al portafolio&quot; para subir tu primera fotografía o proyecto.
            </p>
            <button
              type="button"
              className={styles.editorPrimary}
              style={{ marginTop: 18 }}
              onClick={openCreateForm}
            >
              + Agregar primera foto
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
                  <h4 className={styles.portfolioAdminCardTitle}>
                    {item.title || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sin título</span>}
                  </h4>
                  <p className={styles.portfolioAdminCardDesc}>
                    {item.description || (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sin descripción</span>
                    )}
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
    </div>
  );
}
