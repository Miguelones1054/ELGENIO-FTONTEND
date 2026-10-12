"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import { getYouTubeEmbedUrl, extractYouTubeId } from "@/lib/youtube";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { resolveMediaUrl } from "@/lib/env";
import styles from "@/styles/cover-video-modal.module.css";

/**
 * Flag en memoria del módulo: sobrevive a la navegación SPA entre secciones,
 * pero se reinicia al recargar la página (F5 / abrir de nuevo la URL).
 */
let coverVideoShownThisPageLoad = false;

function CoverVideoModalInner() {
  const { config, ready } = useSiteConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const coverVideo = config?.coverVideo;
  const hasDirectVideo =
    coverVideo?.sourceType === "direct" && Boolean(coverVideo.directUrl?.trim());
  const hasYouTubeVideo =
    coverVideo?.sourceType === "youtube" &&
    Boolean(extractYouTubeId(coverVideo.youtubeUrl));

  const hasValidVideo = hasDirectVideo || hasYouTubeVideo;
  const isEnabled = Boolean(coverVideo?.enabled && hasValidVideo);

  useEffect(() => {
    if (!ready || !isEnabled || new URLSearchParams(window.location.search).get("vista") === "borrador") {
      setIsOpen(false);
      return;
    }

    // Ya se mostró en esta carga de página: no reabrir al volver a Inicio
    if (coverVideoShownThisPageLoad) {
      return;
    }

    setIsVideoLoading(true);

    const timer = setTimeout(() => {
      coverVideoShownThisPageLoad = true;
      setIsOpen(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [ready, isEnabled]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }

    const timer = setTimeout(() => {
      setIsOpen(false);
      setIsExiting(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !coverVideo) {
    return null;
  }

  const youtubeEmbedUrl =
    coverVideo.sourceType === "youtube"
      ? getYouTubeEmbedUrl(coverVideo.youtubeUrl, true)
      : null;

  return (
    <div
      className={[styles.modalBackdrop, isExiting ? styles.isExiting : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={coverVideo.title || "Video de portada"}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className={styles.ambientGlowOrange} aria-hidden="true" />
      <div className={styles.ambientGlowBlue} aria-hidden="true" />

      <div className={styles.modalWrapper}>
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Cerrar video de portada"
          title="Cerrar"
          onClick={handleClose}
        >
          <svg
            className={styles.closeIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.videoCard}>
          <LoadingOverlay
            visible={isVideoLoading}
            text="Cargando video…"
            rounded="md"
          />

          {coverVideo.sourceType === "direct" && coverVideo.directUrl ? (
            <video
              ref={videoRef}
              src={resolveMediaUrl(coverVideo.directUrl)}
              className={styles.directVideo}
              autoPlay
              playsInline
              controls
              loop
              onLoadedData={() => setIsVideoLoading(false)}
              onCanPlay={() => setIsVideoLoading(false)}
            />
          ) : null}

          {coverVideo.sourceType === "youtube" && youtubeEmbedUrl ? (
            <div className={styles.youtubeContainer}>
              <iframe
                className={styles.youtubeIframe}
                src={youtubeEmbedUrl}
                title="Video de YouTube de portada"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => setIsVideoLoading(false)}
              />
            </div>
          ) : null}
        </div>

        <button
          className={styles.continueAction}
          type="button"
          onClick={handleClose}
        >
          Continuar al sitio
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function CoverVideoModal() {
  const pathname = usePathname();

  if (pathname?.startsWith("/administrative-content") || (pathname !== "/" && pathname !== "")) {
    return null;
  }

  return <CoverVideoModalInner />;
}
