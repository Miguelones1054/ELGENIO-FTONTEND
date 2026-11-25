"use client";

import { useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  accessClientProduction,
  formatFileSize,
  resolveProductionMediaUrl,
  type ClientProduction,
  type ProductionFile,
} from "@/lib/productions";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/entregas.module.css";

const page = strings.pages.entregas;

type MediaFilter = "all" | "image" | "video";

export function DeliveriesPageView() {
  const [reference, setReference] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [production, setProduction] = useState<ClientProduction | null>(null);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedRef = reference.trim();
    const cleanPin = pin.replace(/\D/g, "").slice(0, 4);
    if (!trimmedRef) {
      setError("Ingresa la referencia de tu producción.");
      return;
    }
    if (cleanPin.length !== 4) {
      setError("Ingresa el PIN de 4 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const result = await accessClientProduction(trimmedRef, cleanPin);
      setProduction(result);
      setFilter("all");
      setActiveIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos validar tus datos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setProduction(null);
    setFilter("all");
    setActiveIndex(null);
    setError(null);
  }

  const allFiles: ProductionFile[] = production?.files || [];
  const photoCount = allFiles.filter((f) => f.kind === "image").length;
  const videoCount = allFiles.filter((f) => f.kind === "video").length;
  const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  const visibleFiles =
    filter === "all" ? allFiles : allFiles.filter((file) => file.kind === filter);

  const activeFile = activeIndex !== null ? visibleFiles[activeIndex] ?? null : null;

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <SiteHeader brand={strings.brand} nav={strings.nav} keywords={strings.header.keywords} tone="page" />

        {!production ? (
          <section className={styles.hero} aria-labelledby="deliveries-title">
            <div className={styles.wrap}>
              <h1 id="deliveries-title" className={styles.headline}>
                {page.headline}
              </h1>
              <p className={styles.lead}>{page.copy}</p>
              <form className={styles.form} onSubmit={onSubmit}>
                <label className={styles.field} htmlFor="delivery-reference">
                  <span>{page.referenceLabel}</span>
                  <input
                    id="delivery-reference"
                    className={styles.input}
                    type="text"
                    value={reference}
                    placeholder={page.referencePlaceholder}
                    autoComplete="off"
                    disabled={loading}
                    onChange={(event) => setReference(event.target.value)}
                  />
                </label>
                <label className={styles.field} htmlFor="delivery-pin">
                  <span>{page.pinLabel}</span>
                  <input
                    id="delivery-pin"
                    className={`${styles.input} ${styles.pin}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={pin}
                    placeholder={page.pinPlaceholder}
                    disabled={loading}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </label>
                {error ? (
                  <p className={styles.errorBox} role="alert">
                    {error}
                  </p>
                ) : null}
                <button className={styles.submit} type="submit" disabled={loading}>
                  {loading ? "Validando acceso…" : page.submit}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className={styles.gallerySection} aria-labelledby="production-heading">
            <div className={styles.galleryWrap}>
              <header className={styles.galleryHeader}>
                <div className={styles.galleryIntro}>
                  <span className={styles.kicker}>Entrega de producción</span>
                  <h1 id="production-heading" className={styles.productionTitle}>
                    {production.reference}
                  </h1>
                  <p className={styles.productionStats}>
                    {photoCount} {photoCount === 1 ? "foto" : "fotos"} · {videoCount}{" "}
                    {videoCount === 1 ? "video" : "videos"} · Peso original total: {formatFileSize(totalSize)}
                  </p>
                  {production.description ? (
                    <div className={styles.noteBox}>
                      <span className={styles.noteLabel}>Nota de producción</span>
                      <p className={styles.noteText}>{production.description}</p>
                    </div>
                  ) : null}
                </div>

                <button type="button" className={styles.switchBtn} onClick={handleReset}>
                  Cambiar producción
                </button>
              </header>

              {photoCount > 0 && videoCount > 0 ? (
                <div className={styles.filterBar} role="group" aria-label="Filtrar material">
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`}
                    onClick={() => {
                      setFilter("all");
                      setActiveIndex(null);
                    }}
                  >
                    Todo ({allFiles.length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filter === "image" ? styles.filterBtnActive : ""}`}
                    onClick={() => {
                      setFilter("image");
                      setActiveIndex(null);
                    }}
                  >
                    Fotos ({photoCount})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filter === "video" ? styles.filterBtnActive : ""}`}
                    onClick={() => {
                      setFilter("video");
                      setActiveIndex(null);
                    }}
                  >
                    Videos ({videoCount})
                  </button>
                </div>
              ) : null}

              {visibleFiles.length === 0 ? (
                <div className={styles.emptyGallery}>Esta producción todavía se encuentra en preparación.</div>
              ) : (
                <div className={styles.grid}>
                  {visibleFiles.map((file, idx) => {
                    const previewSrc = resolveProductionMediaUrl(file.previewUrl);
                    const downloadHref = resolveProductionMediaUrl(file.downloadUrl);

                    return (
                      <article key={file.id} className={styles.card}>
                        <button
                          type="button"
                          className={styles.thumbButton}
                          onClick={() => setActiveIndex(idx)}
                          aria-label={`Ver vista previa de ${file.originalName}`}
                        >
                          {previewSrc ? (
                            <img
                              className={styles.thumbImg}
                              src={previewSrc}
                              alt={file.originalName}
                              loading="lazy"
                            />
                          ) : (
                            <span className={styles.thumbFallback}>
                              {file.kind === "video" ? "Video original" : "Foto original"}
                            </span>
                          )}
                          {file.kind === "video" ? (
                            <>
                              <span className={styles.mediaTag}>Video</span>
                              <span className={styles.playBadge} aria-hidden="true">
                                ▶
                              </span>
                            </>
                          ) : null}
                        </button>

                        <div className={styles.cardBody}>
                          <p className={styles.cardName} title={file.originalName}>
                            {file.originalName}
                          </p>
                          <div className={styles.cardMetaRow}>
                            <span className={styles.cardSize}>{formatFileSize(file.size)}</span>
                            <a className={styles.downloadBtn} href={downloadHref}>
                              Descargar
                            </a>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {activeFile && activeIndex !== null ? (
        <div
          className={styles.lightboxBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa de archivo"
          onClick={() => setActiveIndex(null)}
        >
          <div className={styles.lightboxShell} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <div className={styles.lightboxTitleGroup}>
                <p className={styles.lightboxTitle}>{activeFile.originalName}</p>
                <span className={styles.lightboxSize}>
                  {activeIndex + 1} de {visibleFiles.length} · Original {formatFileSize(activeFile.size)}
                </span>
              </div>
              <div className={styles.lightboxControls}>
                <a className={styles.downloadBtn} href={resolveProductionMediaUrl(activeFile.downloadUrl)}>
                  Descargar original
                </a>
                <button
                  type="button"
                  className={styles.lightboxClose}
                  onClick={() => setActiveIndex(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className={styles.lightboxStage}>
              {visibleFiles.length > 1 ? (
                <button
                  type="button"
                  className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                  aria-label="Archivo anterior"
                  onClick={() =>
                    setActiveIndex((prev) =>
                      prev === null ? 0 : (prev - 1 + visibleFiles.length) % visibleFiles.length,
                    )
                  }
                >
                  ‹
                </button>
              ) : null}

              {activeFile.kind === "video" ? (
                <video
                  key={activeFile.id}
                  className={styles.lightboxMedia}
                  src={resolveProductionMediaUrl(activeFile.streamUrl)}
                  poster={resolveProductionMediaUrl(activeFile.previewUrl) || undefined}
                  controls
                  playsInline
                />
              ) : (
                <img
                  key={activeFile.id}
                  className={styles.lightboxMedia}
                  src={resolveProductionMediaUrl(activeFile.previewUrl)}
                  alt={activeFile.originalName}
                />
              )}

              {visibleFiles.length > 1 ? (
                <button
                  type="button"
                  className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                  aria-label="Archivo siguiente"
                  onClick={() =>
                    setActiveIndex((prev) => (prev === null ? 0 : (prev + 1) % visibleFiles.length))
                  }
                >
                  ›
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
