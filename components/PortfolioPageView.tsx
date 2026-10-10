"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { AccentShapes } from "@/components/AccentShapes";
import { Icon } from "@/components/Icon";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteConfig, type PortfolioItem } from "@/components/SiteConfigProvider";
import { resolveMediaUrl } from "@/lib/env";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/portfolio.module.css";

function isExternalLink(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith("//") || url.startsWith("mailto:") || url.startsWith("tel:");
}

type Orientation = "horizontal" | "vertical";

const ORIENTATION_CACHE_KEY = "elgenio_portfolio_orientations";

function getStoredOrientationCache(): Record<string, Orientation> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ORIENTATION_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function storeOrientationCache(map: Record<string, Orientation>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ORIENTATION_CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignorar excepciones de cuota en storage
  }
}

export function PortfolioPageView() {
  const { config } = useSiteConfig();
  const [lightboxItem, setLightboxItem] = useState<PortfolioItem | null>(null);

  // Inicializar orientación con caché síncrona para evitar saltos o re-renders
  const [orientationMap, setOrientationMap] = useState<Record<string, Orientation>>(() => {
    return getStoredOrientationCache();
  });

  const [landscapeActiveIndex, setLandscapeActiveIndex] = useState(0);
  const [verticalActiveIndex, setVerticalActiveIndex] = useState(0);

  const items = useMemo(() => {
    return (config.portfolio || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.portfolio]);

  const landscapeTrackRef = useRef<HTMLDivElement>(null);
  const verticalTrackRef = useRef<HTMLDivElement>(null);

  // Detección en lote (batch) de orientación para elementos que aún no están en caché
  useEffect(() => {
    if (!items.length) return;
    const missingItems = items.filter((item) => item.imageUrl && !orientationMap[item.id]);
    if (!missingItems.length) return;

    let cancelled = false;
    const detected: Record<string, Orientation> = {};
    let pendingCount = missingItems.length;

    missingItems.forEach((item) => {
      const img = new Image();
      img.src = resolveMediaUrl(item.imageUrl);

      const checkDim = () => {
        if (cancelled) return;
        const isVert = img.naturalHeight > img.naturalWidth * 1.05;
        detected[item.id] = isVert ? "vertical" : "horizontal";
        pendingCount -= 1;
        if (pendingCount === 0) {
          setOrientationMap((prev) => {
            const next = { ...prev, ...detected };
            storeOrientationCache(next);
            return next;
          });
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        checkDim();
      } else {
        img.onload = checkDim;
        img.onerror = () => {
          if (cancelled) return;
          detected[item.id] = "horizontal";
          pendingCount -= 1;
          if (pendingCount === 0) {
            setOrientationMap((prev) => {
              const next = { ...prev, ...detected };
              storeOrientationCache(next);
              return next;
            });
          }
        };
      }
    });

    return () => {
      cancelled = true;
    };
  }, [items, orientationMap]);

  // Clasificación en 2 conjuntos estables
  const horizontalItems = useMemo(
    () => items.filter((item) => orientationMap[item.id] !== "vertical"),
    [items, orientationMap]
  );
  const verticalItems = useMemo(
    () => items.filter((item) => orientationMap[item.id] === "vertical"),
    [items, orientationMap]
  );

  // Función para desplazar horizontalmente con flechas
  const scrollTrack = (ref: React.RefObject<HTMLDivElement | null>, offset: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Detección de elemento activo en el scroll sin Layout Thrashing
  const handleTrackScroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    setIndex: React.Dispatch<React.SetStateAction<number>>,
    defaultStep: number
  ) => {
    const el = ref.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    const cardStep = firstChild ? firstChild.offsetWidth + 22 : defaultStep;
    const closestIndex = Math.max(0, Math.round(el.scrollLeft / cardStep));
    setIndex((prev) => (prev !== closestIndex ? closestIndex : prev));
  };

  // Moverse directamente al elemento al hacer clic en un punto indicador
  const scrollToItem = (
    ref: React.RefObject<HTMLDivElement | null>,
    index: number,
    defaultStep: number
  ) => {
    const el = ref.current;
    if (!el) return;
    const children = el.children;
    if (children[index]) {
      (children[index] as HTMLElement).scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    } else {
      el.scrollTo({ left: index * defaultStep, behavior: "smooth" });
    }
  };

  // Cerrar lightbox con tecla ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxItem(null);
      }
    }
    if (lightboxItem) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxItem]);

  function renderCard(item: PortfolioItem, index: number, isVertical: boolean) {
    const resolvedUrl = resolveMediaUrl(item.imageUrl);
    const hasBtn = Boolean(item.hasButton && item.buttonText?.trim() && item.buttonUrl?.trim());
    const isExternal = hasBtn ? isExternalLink(item.buttonUrl!) : false;

    return (
      <article
        key={item.id}
        className={`${styles.carouselCard} ${isVertical ? styles.carouselCardVertical : styles.carouselCardHorizontal}`}
      >
        {/* Superficie de la fotografía */}
        <div
          className={`${styles.photoSurface} ${isVertical ? styles.photoSurfaceVertical : styles.photoSurfaceHorizontal}`}
          onClick={() => setLightboxItem(item)}
          role="button"
          tabIndex={0}
          aria-label={`Ver foto en pantalla completa: ${item.title || "Proyecto"}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setLightboxItem(item);
            }
          }}
        >
          <img
            src={resolvedUrl}
            alt={item.title || `Proyecto ${index + 1}`}
            className={styles.collageImage}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={index === 0 ? "high" : "low"}
          />

          {/* Micro-badge con número */}
          <span className={styles.photoIndexBadge}>
            {String(index + 1).padStart(2, "0")}
          </span>

          {/* Icono de zoom al pasar el cursor */}
          <div className={styles.zoomAffordance} aria-hidden="true" title="Ampliar imagen">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
        </div>

        {/* Metadatos y llamada a la acción */}
        {(item.title || item.description || hasBtn) && (
          <div className={styles.photoCaption}>
            <div className={styles.captionText}>
              {item.title && <h2 className={styles.captionTitle}>{item.title}</h2>}
              {item.description && <p className={styles.captionDesc}>{item.description}</p>}
            </div>

            {hasBtn && (
              <div className={styles.captionButtonWrap}>
                {isExternal ? (
                  <a
                    href={item.buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.actionButton}
                  >
                    <span>{item.buttonText}</span>
                    <span className={styles.buttonArrow} aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <Link href={item.buttonUrl!} className={styles.actionButton}>
                    <span>{item.buttonText}</span>
                    <span className={styles.buttonArrow} aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <main className={styles.page}>
      {/* FONDOS ORGÁNICOS CON ANILLOS SUAVES DE COLOR NARANJA */}
      <div className={styles.pageBackdrop} aria-hidden="true">
        <div className={`${styles.bgRing} ${styles.bgRing1}`}>
          <Icon id="marks/hand-arc" className={styles.arcSvg} />
        </div>
        <div className={`${styles.bgRing} ${styles.bgRing2}`}>
          <Icon id="marks/hand-arc" className={styles.arcSvg} />
        </div>
        <div className={`${styles.bgRing} ${styles.bgRing3}`}>
          <Icon id="marks/hand-arc" className={styles.arcSvg} />
        </div>
        <div className={`${styles.bgRing} ${styles.bgRing4}`}>
          <Icon id="marks/hand-arc" className={styles.arcSvg} />
        </div>
      </div>

      <div className={styles.contentShell}>
        <SiteHeader
          brand={strings.brand}
          nav={strings.nav}
          keywords={strings.header.keywords}
          tone="page"
        />

        {/* CABECERA */}
        <section className={styles.headerSection} aria-label="Portafolio">
          <AccentShapes variant="section" side="right" />
          <div className={styles.headerInner}>
            <div className={styles.headerTitleRow}>
              <div className={styles.titleMask}>
                <h1 className={styles.title}>Portafolio</h1>
              </div>
            </div>
            <div className={styles.headerAccentLine} />
          </div>
        </section>

        {/* TRANSICIÓN AMBIENTAL ENTRE CABECERA Y CARRUSELES */}
        <div className={styles.sectionDivider} aria-hidden="true" />

        {/* SECCIÓN CON 2 CAROUSELES EN SCROLL HORIZONTAL (2 FILAS) */}
        <section className={styles.carouselSection} aria-label="Galería en dos carruseles">
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-subtle)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <h2 className={styles.emptyTitle}>Próximamente más proyectos</h2>
              <p className={styles.emptySubtitle}>
                Estamos actualizando la selección de nuestras piezas y producciones recientes. ¡Vuelve pronto o
                contáctanos para ver más material exclusivo!
              </p>
              <Link href="/contacto" className={styles.actionButton}>
                Cuéntanos tu proyecto
                <span className={styles.buttonArrow}>→</span>
              </Link>
            </div>
          ) : (
            <div className={styles.carouselsContainer}>
              {/* FILA 1: PAISAJE / HORIZONTAL */}
              {horizontalItems.length > 0 && (
                <div className={`${styles.carouselRow} ${styles.carouselRowHorizontal}`}>
                  <div className={styles.carouselTrackWrapper}>
                    <button
                      type="button"
                      className={`${styles.navArrow} ${styles.navArrowLeft}`}
                      onClick={() => scrollTrack(landscapeTrackRef, -460)}
                      aria-label="Desplazar proyectos anteriores"
                    >
                      <Icon id="actions/chevron-left" className={styles.chevronIcon} />
                    </button>

                    <div
                      ref={landscapeTrackRef}
                      className={styles.carouselTrack}
                      onScroll={() => handleTrackScroll(landscapeTrackRef, setLandscapeActiveIndex, 330)}
                    >
                      {horizontalItems.map((item, idx) => renderCard(item, idx, false))}
                    </div>

                    <button
                      type="button"
                      className={`${styles.navArrow} ${styles.navArrowRight}`}
                      onClick={() => scrollTrack(landscapeTrackRef, 460)}
                      aria-label="Desplazar siguientes proyectos"
                    >
                      <Icon id="actions/chevron-right" className={styles.chevronIcon} />
                    </button>
                  </div>

                  {/* INDICADOR DE POSICIÓN AGRUPADO CON PUNTOS SUAVES NARANJAS */}
                  {horizontalItems.length > 1 && (
                    <div className={styles.dotsWrapper} aria-label="Indicador de posición de proyectos horizontales">
                      <div className={styles.dotsGroup}>
                        {horizontalItems.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`${styles.dot} ${idx === landscapeActiveIndex ? styles.dotActive : ""}`}
                            onClick={() => scrollToItem(landscapeTrackRef, idx, 330)}
                            aria-label={`Ir a proyecto horizontal ${idx + 1} de ${horizontalItems.length}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TRANSICIÓN FLUIDA ENTRE SECCIÓN HORIZONTAL Y VERTICAL */}
              {horizontalItems.length > 0 && verticalItems.length > 0 && (
                <div className={styles.rowTransitionBridge} aria-hidden="true">
                  <div className={styles.rowBridgeGlow} />
                  <div className={styles.rowBridgeLine} />
                </div>
              )}

              {/* FILA 2: DIRECCIÓN VERTICAL / MÓVIL */}
              {verticalItems.length > 0 && (
                <div className={`${styles.carouselRow} ${styles.carouselRowVertical}`}>
                  <div className={styles.carouselTrackWrapper}>
                    <button
                      type="button"
                      className={`${styles.navArrow} ${styles.navArrowLeft}`}
                      onClick={() => scrollTrack(verticalTrackRef, -380)}
                      aria-label="Desplazar proyectos verticales anteriores"
                    >
                      <Icon id="actions/chevron-left" className={styles.chevronIcon} />
                    </button>

                    <div
                      ref={verticalTrackRef}
                      className={styles.carouselTrack}
                      onScroll={() => handleTrackScroll(verticalTrackRef, setVerticalActiveIndex, 220)}
                    >
                      {verticalItems.map((item, idx) => renderCard(item, idx, true))}
                    </div>

                    <button
                      type="button"
                      className={`${styles.navArrow} ${styles.navArrowRight}`}
                      onClick={() => scrollTrack(verticalTrackRef, 380)}
                      aria-label="Desplazar siguientes proyectos verticales"
                    >
                      <Icon id="actions/chevron-right" className={styles.chevronIcon} />
                    </button>
                  </div>

                  {/* INDICADOR DE POSICIÓN AGRUPADO CON PUNTOS SUAVES NARANJAS */}
                  {verticalItems.length > 1 && (
                    <div className={styles.dotsWrapper} aria-label="Indicador de posición de proyectos verticales">
                      <div className={styles.dotsGroup}>
                        {verticalItems.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`${styles.dot} ${idx === verticalActiveIndex ? styles.dotActive : ""}`}
                            onClick={() => scrollToItem(verticalTrackRef, idx, 220)}
                            aria-label={`Ir a proyecto vertical ${idx + 1} de ${verticalItems.length}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* LIGHTBOX MODAL EN ALTA DEFINICIÓN */}
      {lightboxItem && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setLightboxItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title || "Visualizador de imagen"}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setLightboxItem(null)}
            aria-label="Cerrar imagen ampliada"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={resolveMediaUrl(lightboxItem.imageUrl)}
              alt={lightboxItem.title || "Foto ampliada"}
              className={styles.lightboxImage}
              decoding="async"
            />

            {(lightboxItem.title || lightboxItem.description || (lightboxItem.hasButton && lightboxItem.buttonText)) && (
              <div className={styles.lightboxFooter}>
                <div className={styles.lightboxText}>
                  {lightboxItem.title && <h3 className={styles.lightboxTitle}>{lightboxItem.title}</h3>}
                  {lightboxItem.description && <p className={styles.lightboxDesc}>{lightboxItem.description}</p>}
                </div>

                {lightboxItem.hasButton && lightboxItem.buttonText && lightboxItem.buttonUrl && (
                  <div>
                    {isExternalLink(lightboxItem.buttonUrl) ? (
                      <a
                        href={lightboxItem.buttonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionButton}
                      >
                        <span>{lightboxItem.buttonText}</span>
                        <span className={styles.buttonArrow} aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <Link href={lightboxItem.buttonUrl} className={styles.actionButton}>
                        <span>{lightboxItem.buttonText}</span>
                        <span className={styles.buttonArrow} aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
