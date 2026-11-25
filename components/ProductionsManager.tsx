"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  buildDeliveryShareMessage,
  createAdminProduction,
  deleteAdminProduction,
  deleteAdminProductionFile,
  detectProductionFileKind,
  formatFileSize,
  generateRandomPin,
  listAdminProductions,
  resolveProductionMediaUrl,
  uploadProductionFileWithProgress,
  type AdminProduction,
  type FileUploadStage,
  type ProductionFile,
  type ProductionFileKind,
} from "@/lib/productions";
import styles from "@/styles/productions.module.css";

type QueuedUploadItem = {
  localId: string;
  file: File;
  kind: ProductionFileKind;
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  stage: FileUploadStage;
  error?: string;
};

type ShareModalState = {
  reference: string;
  pin: string;
};

type InlineUploadState = {
  productionId: string;
  currentIndex: number;
  totalFiles: number;
  currentFileName: string;
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  stage: FileUploadStage;
};

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProductionsManager() {
  const [productions, setProductions] = useState<AdminProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Formulario nueva producción
  const [reference, setReference] = useState("");
  const [pin, setPin] = useState(() => generateRandomPin());
  const [description, setDescription] = useState("");
  const [queue, setQueue] = useState<QueuedUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estado UI de colecciones existentes
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingFileKey, setDeletingFileKey] = useState<string | null>(null);
  const [inlineUpload, setInlineUpload] = useState<InlineUploadState | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Modales
  const [shareModal, setShareModal] = useState<ShareModalState | null>(null);
  const [copied, setCopied] = useState(false);
  const [lightboxFile, setLightboxFile] = useState<ProductionFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreTargetRef = useRef<string | null>(null);

  const refreshProductions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const items = await listAdminProductions();
      setProductions(items);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudieron cargar las producciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProductions();
  }, [refreshProductions]);

  function addFilesToQueue(fileList: FileList | File[]) {
    setFormError(null);
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const valid: QueuedUploadItem[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      const kind = detectProductionFileKind(file);
      if (!kind) {
        rejected.push(file.name);
        continue;
      }
      valid.push({
        localId: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        file,
        kind,
        uploadedBytes: 0,
        totalBytes: file.size,
        percent: 0,
        stage: "queued",
      });
    }

    if (rejected.length > 0) {
      setFormError(`Algunos archivos tienen un formato incompatible y se omitieron: ${rejected.join(", ")}`);
    }

    if (valid.length > 0) {
      setQueue((prev) => [...prev, ...valid]);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (submitting) return;
    if (event.dataTransfer.files?.length) {
      addFilesToQueue(event.dataTransfer.files);
    }
  }

  function removeQueuedItem(localId: string) {
    if (submitting) return;
    setQueue((prev) => prev.filter((item) => item.localId !== localId));
  }

  async function handleCreateAndUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedRef = reference.trim();
    const cleanPin = pin.replace(/\D/g, "").slice(0, 4);

    if (!trimmedRef) {
      setFormError("Ingresa una referencia para identificar la producción.");
      return;
    }
    if (cleanPin.length !== 4) {
      setFormError("El PIN de acceso debe tener exactamente 4 dígitos.");
      return;
    }
    if (queue.length === 0) {
      setFormError("Selecciona al menos una foto o video para subir a la colección.");
      return;
    }

    setSubmitting(true);
    let created: AdminProduction | null = null;

    try {
      created = await createAdminProduction({
        reference: trimmedRef,
        pin: cleanPin,
        description: description.trim(),
      });

      let latestProduction = created;
      setProductions((prev) => [latestProduction, ...prev]);

      for (const item of queue) {
        setQueue((prev) =>
          prev.map((q) => (q.localId === item.localId ? { ...q, stage: "uploading", error: undefined } : q)),
        );

        try {
          const result = await uploadProductionFileWithProgress(created.id, item.file, (progress) => {
            setQueue((prev) =>
              prev.map((q) =>
                q.localId === item.localId
                  ? {
                      ...q,
                      uploadedBytes: progress.uploadedBytes,
                      totalBytes: progress.totalBytes,
                      percent: progress.percent,
                      stage: progress.stage,
                    }
                  : q,
              ),
            );
          });
          latestProduction = result.production;
          setProductions((prev) => prev.map((p) => (p.id === latestProduction.id ? latestProduction : p)));
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error ? uploadErr.message : "Error al subir el archivo";
          setQueue((prev) =>
            prev.map((q) => (q.localId === item.localId ? { ...q, stage: "error", error: msg } : q)),
          );
          throw new Error(
            `Falló la subida de "${item.file.name}": ${msg}. La colección "${created.reference}" quedó guardada para que puedas completar los archivos faltantes o eliminarla.`,
          );
        }
      }

      // Todos los archivos subieron exitosamente: abrir modal con mensaje y botón copiar
      const createdRef = latestProduction.reference;
      const createdPin = latestProduction.pin;
      setExpandedIds((prev) => ({ ...prev, [latestProduction.id]: true }));
      setReference("");
      setDescription("");
      setPin(generateRandomPin());
      setQueue([]);
      setCopied(false);
      setShareModal({ reference: createdRef, pin: createdPin });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo completar la creación de la producción.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMoreFiles(productionId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setInlineError(null);
    const files = Array.from(fileList).filter((f) => detectProductionFileKind(f) !== null);
    if (files.length === 0) {
      setInlineError("Solo se permiten fotos o videos compatibles.");
      return;
    }

    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    let completedBytes = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadProductionFileWithProgress(productionId, file, (progress) => {
          const currentUploaded = completedBytes + progress.uploadedBytes;
          const overallPct = totalBytes > 0 ? Math.min(100, Math.round((currentUploaded / totalBytes) * 100)) : 100;
          setInlineUpload({
            productionId,
            currentIndex: i + 1,
            totalFiles: files.length,
            currentFileName: file.name,
            uploadedBytes: currentUploaded,
            totalBytes,
            percent: overallPct,
            stage: progress.stage,
          });
        });
        completedBytes += file.size;
        setProductions((prev) => prev.map((p) => (p.id === productionId ? result.production : p)));
      }
      setExpandedIds((prev) => ({ ...prev, [productionId]: true }));
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "Error al agregar archivos");
    } finally {
      setInlineUpload(null);
      if (addMoreInputRef.current) {
        addMoreInputRef.current.value = "";
      }
    }
  }

  async function handleDeleteProduction(prod: AdminProduction) {
    const confirmed = window.confirm(
      `¿Eliminar completamente la producción "${prod.reference}"?\n\nEsto borrará el registro y eliminará todos sus archivos originales y miniaturas del servidor.`,
    );
    if (!confirmed) return;

    setDeletingId(prod.id);
    setInlineError(null);
    try {
      await deleteAdminProduction(prod.id);
      setProductions((prev) => prev.filter((p) => p.id !== prod.id));
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "No se pudo eliminar la producción");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteSingleFile(prod: AdminProduction, file: ProductionFile) {
    const confirmed = window.confirm(`¿Eliminar el archivo "${file.originalName}" del servidor?`);
    if (!confirmed) return;

    const key = `${prod.id}:${file.id}`;
    setDeletingFileKey(key);
    setInlineError(null);
    try {
      await deleteAdminProductionFile(prod.id, file.id);
      setProductions((prev) =>
        prev.map((p) =>
          p.id === prod.id ? { ...p, files: p.files.filter((f) => f.id !== file.id) } : p,
        ),
      );
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "No se pudo eliminar el archivo");
    } finally {
      setDeletingFileKey(null);
    }
  }

  async function handleCopyShareMessage() {
    if (!shareModal) return;
    const text = buildDeliveryShareMessage(shareModal.reference, shareModal.pin);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2600);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2600);
    }
  }

  const totalQueueBytes = queue.reduce((sum, item) => sum + item.totalBytes, 0);
  const uploadedQueueBytes = queue.reduce((sum, item) => sum + item.uploadedBytes, 0);
  const overallQueuePercent =
    totalQueueBytes > 0 ? Math.min(100, Math.round((uploadedQueueBytes / totalQueueBytes) * 100)) : 0;
  const doneCount = queue.filter((q) => q.stage === "done").length;
  const activeItem = queue.find((q) => q.stage === "uploading" || q.stage === "processing");

  return (
    <div className={styles.wrap}>
      {/* Crear nueva producción */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Nueva producción para entrega</h2>
            <p className={styles.sectionSubtitle}>
              Los archivos se suben directamente al servidor conservando su tamaño y calidad original. El sistema genera
              vistas previas ligeras y miniaturas de video de forma automática.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAndUpload}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.label}>Referencia *</span>
              <input
                className={styles.input}
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. BODA-SOFIA-2026"
                disabled={submitting}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>PIN de acceso (4 dígitos) *</span>
              <div className={styles.pinRow}>
                <input
                  className={`${styles.input} ${styles.pinInput}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  disabled={submitting}
                  required
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={submitting}
                  onClick={() => setPin(generateRandomPin())}
                >
                  Nuevo PIN
                </button>
              </div>
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Descripción o anotación para el cliente (opcional)</span>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Material editado en máxima resolución. Recuerda descargarlo en un computador o celular con espacio disponible."
                disabled={submitting}
              />
            </label>
          </div>

          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
            onClick={() => {
              if (!submitting) fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!submitting) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (!submitting && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <p className={styles.dropzoneTitle}>Haz clic o arrastra aquí las fotos y videos originales</p>
            <p className={styles.dropzoneHint}>
              Puedes seleccionar múltiples fotos y videos a la vez · Conservan su tamaño y calidad 100% original
            </p>
            <input
              ref={fileInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={submitting}
              onChange={(e) => {
                if (e.target.files) {
                  addFilesToQueue(e.target.files);
                }
                e.target.value = "";
              }}
            />
          </div>

          {queue.length > 0 ? (
            <div className={styles.queueBox}>
              <div className={styles.queueSummary}>
                <span>
                  {queue.length} {queue.length === 1 ? "archivo seleccionado" : "archivos seleccionados"} ·{" "}
                  {formatFileSize(totalQueueBytes)}
                </span>
                {!submitting ? (
                  <button type="button" className={styles.smallRemoveBtn} onClick={() => setQueue([])}>
                    Limpiar lista
                  </button>
                ) : null}
              </div>

              {submitting ? (
                <div className={styles.overallProgressCard} aria-live="polite">
                  <div className={styles.progressTop}>
                    <span>
                      {activeItem?.stage === "processing"
                        ? `Generando vista previa de ${activeItem.file.name}…`
                        : `Subiendo archivo ${Math.min(doneCount + 1, queue.length)} de ${queue.length}`}
                    </span>
                    <span className={styles.progressPercent}>{overallQueuePercent}%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${overallQueuePercent}%` }} />
                  </div>
                  <div className={styles.progressSub}>
                    <span>
                      {formatFileSize(uploadedQueueBytes)} de {formatFileSize(totalQueueBytes)}
                    </span>
                    {activeItem ? <span>{activeItem.file.name}</span> : null}
                  </div>
                </div>
              ) : null}

              <div className={styles.queueList}>
                {queue.map((item) => (
                  <div key={item.localId} className={styles.queueItem}>
                    <div className={styles.queueItemRow}>
                      <div className={styles.queueMeta}>
                        <span
                          className={`${styles.kindBadge} ${
                            item.kind === "video" ? styles.kindVideo : styles.kindImage
                          }`}
                        >
                          {item.kind === "video" ? "Video" : "Foto"}
                        </span>
                        <span className={styles.fileName} title={item.file.name}>
                          {item.file.name}
                        </span>
                        <span className={styles.fileSize}>{formatFileSize(item.totalBytes)}</span>
                      </div>

                      <div className={styles.queueRight}>
                        {item.stage === "queued" ? (
                          <button
                            type="button"
                            className={styles.smallRemoveBtn}
                            disabled={submitting}
                            onClick={() => removeQueuedItem(item.localId)}
                          >
                            Quitar
                          </button>
                        ) : item.stage === "uploading" ? (
                          <span className={styles.stageText}>{item.percent}%</span>
                        ) : item.stage === "processing" ? (
                          <span className={styles.stageText}>Generando miniatura…</span>
                        ) : item.stage === "done" ? (
                          <span className={`${styles.stageText} ${styles.stageDone}`}>Listo (100%)</span>
                        ) : (
                          <span className={`${styles.stageText} ${styles.stageError}`}>Error</span>
                        )}
                      </div>
                    </div>

                    {item.stage !== "queued" ? (
                      <div className={styles.miniTrack}>
                        <div
                          className={`${styles.miniFill} ${item.stage === "done" ? styles.miniFillDone : ""}`}
                          style={{ width: `${item.stage === "done" ? 100 : item.percent}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {formError ? <div className={styles.errorBanner}>{formError}</div> : null}

          <div className={styles.formFooter}>
            <span className={styles.sectionSubtitle}>
              El cliente accederá desde <strong>elgenio.co/entregas</strong> con la referencia y el PIN.
            </span>
            <button type="submit" className={styles.primaryBtn} disabled={submitting || queue.length === 0}>
              {submitting ? `Subiendo… ${overallQueuePercent}%` : "Crear producción y subir archivos"}
            </button>
          </div>
        </form>
      </section>

      {/* Colecciones existentes */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Colecciones creadas ({productions.length})</h2>
            <p className={styles.sectionSubtitle}>
              Previsualiza las entregas, descarga archivos originales, copia el mensaje para el cliente o elimina
              colecciones completas del servidor.
            </p>
          </div>
          <button type="button" className={styles.secondaryBtn} onClick={refreshProductions} disabled={loading}>
            Actualizar lista
          </button>
        </div>

        <input
          ref={addMoreInputRef}
          className={styles.hiddenInput}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => {
            const targetId = addMoreTargetRef.current;
            if (targetId) {
              handleAddMoreFiles(targetId, e.target.files);
            }
          }}
        />

        {inlineError ? <div className={styles.errorBanner}>{inlineError}</div> : null}
        {loadError ? <div className={styles.errorBanner}>{loadError}</div> : null}

        {loading ? (
          <div className={styles.emptyState}>Cargando producciones…</div>
        ) : productions.length === 0 ? (
          <div className={styles.emptyState}>Aún hay espacio disponible para tu primera producción.</div>
        ) : (
          <div className={styles.listStack}>
            {productions.map((prod) => {
              const photoCount = prod.files.filter((f) => f.kind === "image").length;
              const videoCount = prod.files.filter((f) => f.kind === "video").length;
              const totalSize = prod.files.reduce((sum, f) => sum + (f.size || 0), 0);
              const isExpanded = Boolean(expandedIds[prod.id]);
              const isUploadingHere = inlineUpload?.productionId === prod.id;

              return (
                <article key={prod.id} className={styles.prodCard}>
                  <div className={styles.prodHeader}>
                    <div className={styles.prodInfo}>
                      <div className={styles.prodTitleRow}>
                        <h3 className={styles.prodRef}>{prod.reference}</h3>
                        <span className={styles.pinChip}>PIN: {prod.pin}</span>
                      </div>
                      <p className={styles.prodMeta}>
                        {photoCount} {photoCount === 1 ? "foto" : "fotos"} · {videoCount}{" "}
                        {videoCount === 1 ? "video" : "videos"} · {formatFileSize(totalSize)} ·{" "}
                        {formatDate(prod.createdAt)}
                      </p>
                      {prod.description ? <p className={styles.prodDesc}>{prod.description}</p> : null}
                    </div>

                    <div className={styles.prodActions}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnAccent}`}
                        onClick={() => {
                          setCopied(false);
                          setShareModal({ reference: prod.reference, pin: prod.pin });
                        }}
                      >
                        Mensaje de entrega
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        disabled={Boolean(inlineUpload) || submitting}
                        onClick={() => {
                          addMoreTargetRef.current = prod.id;
                          addMoreInputRef.current?.click();
                        }}
                      >
                        Agregar archivos
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() =>
                          setExpandedIds((prev) => ({
                            ...prev,
                            [prod.id]: !prev[prod.id],
                          }))
                        }
                      >
                        {isExpanded ? "Ocultar archivos" : `Ver archivos (${prod.files.length})`}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        disabled={deletingId === prod.id || isUploadingHere}
                        onClick={() => handleDeleteProduction(prod)}
                      >
                        {deletingId === prod.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </div>
                  </div>

                  {isUploadingHere && inlineUpload ? (
                    <div className={styles.inlineUploadBar}>
                      <div className={styles.overallProgressCard} aria-live="polite">
                        <div className={styles.progressTop}>
                          <span>
                            {inlineUpload.stage === "processing"
                              ? `Generando vista previa de ${inlineUpload.currentFileName}…`
                              : `Subiendo archivo ${inlineUpload.currentIndex} de ${inlineUpload.totalFiles}`}
                          </span>
                          <span className={styles.progressPercent}>{inlineUpload.percent}%</span>
                        </div>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressFill} style={{ width: `${inlineUpload.percent}%` }} />
                        </div>
                        <div className={styles.progressSub}>
                          <span>
                            {formatFileSize(inlineUpload.uploadedBytes)} de {formatFileSize(inlineUpload.totalBytes)}
                          </span>
                          <span>{inlineUpload.currentFileName}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isExpanded ? (
                    <div className={styles.filesPanel}>
                      {prod.files.length === 0 ? (
                        <div className={styles.emptyState}>Esta colección todavía tiene 0 archivos.</div>
                      ) : (
                        <div className={styles.filesGrid}>
                          {prod.files.map((file) => {
                            const previewSrc = resolveProductionMediaUrl(file.previewUrl);
                            const downloadHref = resolveProductionMediaUrl(file.downloadUrl);
                            const fileKey = `${prod.id}:${file.id}`;

                            return (
                              <div key={file.id} className={styles.mediaCard}>
                                <button
                                  type="button"
                                  className={styles.mediaThumbBtn}
                                  onClick={() => setLightboxFile(file)}
                                  title="Abrir vista previa"
                                >
                                  {previewSrc ? (
                                    <img
                                      className={styles.mediaThumbImg}
                                      src={previewSrc}
                                      alt={file.originalName}
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className={styles.videoPlaceholder}>
                                      {file.kind === "video" ? "Video" : "Foto"}
                                    </span>
                                  )}
                                  {file.kind === "video" ? (
                                    <>
                                      <span className={styles.videoBadge}>Video</span>
                                      <span className={styles.playOverlay} aria-hidden="true">
                                        ▶
                                      </span>
                                    </>
                                  ) : null}
                                </button>

                                <div className={styles.mediaBody}>
                                  <p className={styles.mediaName} title={file.originalName}>
                                    {file.originalName}
                                  </p>
                                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                                  <div className={styles.mediaFoot}>
                                    <a className={styles.downloadLink} href={downloadHref}>
                                      Descargar
                                    </a>
                                    <button
                                      type="button"
                                      className={styles.smallRemoveBtn}
                                      disabled={deletingFileKey === fileKey}
                                      onClick={() => handleDeleteSingleFile(prod, file)}
                                    >
                                      {deletingFileKey === fileKey ? "…" : "Quitar"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal de entrega con botón Copiar */}
      {shareModal ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          onClick={() => setShareModal(null)}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="share-modal-title" className={styles.modalTitle}>
              Material listo para compartir
            </h3>
            <p className={styles.modalSubtitle}>
              Copia este mensaje y envíaselo a tu cliente para que descargue sus archivos originales.
            </p>
            <pre className={styles.messageBox}>
              {buildDeliveryShareMessage(shareModal.reference, shareModal.pin)}
            </pre>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setShareModal(null)}>
                Cerrar
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleCopyShareMessage}>
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Lightbox de vista previa en Admin */}
      {lightboxFile ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa de archivo"
          onClick={() => setLightboxFile(null)}
        >
          <div className={styles.lightboxCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxTop}>
              <p className={styles.lightboxName}>
                {lightboxFile.originalName} · {formatFileSize(lightboxFile.size)}
              </p>
              <div className={styles.lightboxActions}>
                <a className={styles.downloadLink} href={resolveProductionMediaUrl(lightboxFile.downloadUrl)}>
                  Descargar original
                </a>
                <button
                  type="button"
                  className={styles.lightboxCloseBtn}
                  onClick={() => setLightboxFile(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className={styles.lightboxStage}>
              {lightboxFile.kind === "video" ? (
                <video
                  className={styles.lightboxVideo}
                  src={resolveProductionMediaUrl(lightboxFile.streamUrl)}
                  poster={resolveProductionMediaUrl(lightboxFile.previewUrl) || undefined}
                  controls
                  playsInline
                />
              ) : (
                <img
                  className={styles.lightboxImg}
                  src={resolveProductionMediaUrl(lightboxFile.previewUrl)}
                  alt={lightboxFile.originalName}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
