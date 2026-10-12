"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminEditor, type EditableBlockId, type PreviewPage } from "@/components/AdminEditorContext";
import adminStyles from "@/styles/admin.module.css";

const PAGE_SRC: Record<PreviewPage, string> = {
  inicio: "/?vista=borrador",
  portafolio: "/portafolio",
  nosotros: "/nosotros?vista=borrador",
  contacto: "/contacto",
};

const PAGE_LABEL: Record<PreviewPage, string> = {
  inicio: "Inicio",
  portafolio: "Portafolio",
  nosotros: "Nosotros",
  contacto: "Contacto",
};

const INICIO_BLOCKS: { id: EditableBlockId; label: string }[] = [
  { id: "hero-title", label: "Título" },
  { id: "collage-hero", label: "Fondo" },
  { id: "collage-portrait", label: "Retrato" },
  { id: "whatsapp", label: "WhatsApp" },
];

export function AdminPagePreview() {
  const { previewViewport, previewPage, aboutDraft, startEdit } = useAdminEditor();
  const isNarrow = previewViewport === "mobile";
  const previewWidth = isNarrow ? 390 : 1280;
  const previewHeight = isNarrow ? 844 : 900;
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const aboutDraftRef = useRef(aboutDraft);
  const [scale, setScale] = useState(1);
  aboutDraftRef.current = aboutDraft;

  function publishAboutDraft() {
    frameRef.current?.contentWindow?.postMessage(
      { type: "about-draft", payload: aboutDraftRef.current },
      window.location.origin,
    );
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const available = stage.clientWidth;
      setScale(available > 0 ? Math.min(1, available / previewWidth) : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [previewWidth]);

  useEffect(() => {
    if (previewPage !== "nosotros") return;

    publishAboutDraft();

    function onReady(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "about-preview-ready") return;
      publishAboutDraft();
    }

    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [previewPage, aboutDraft]);

  const hint =
    previewPage === "contacto"
      ? "Así se ve Contacto. Desplázate dentro del recuadro para ver el formulario completo."
      : previewPage === "nosotros"
        ? "Así se ve Nosotros. La portada y el equipo cambian con el formulario de abajo."
        : previewPage === "portafolio"
          ? "Así se ve Portafolio. Desplázate dentro del recuadro para ver las colecciones y el cierre."
          : isNarrow
            ? "Así se ve Inicio en el teléfono. Desplázate dentro del recuadro."
            : "Así se ve Inicio en escritorio. Desplázate dentro del recuadro.";

  return (
    <div className={adminStyles.previewStage}>
      <div className={adminStyles.previewHint}>{hint}</div>

      {previewPage === "inicio" ? (
        <div className={adminStyles.previewToolbar}>
          {INICIO_BLOCKS.map((block) => (
            <button
              key={block.id}
              className={adminStyles.viewportBtn}
              type="button"
              onClick={() => startEdit(block.id)}
            >
              Editar {block.label}
            </button>
          ))}
        </div>
      ) : null}

      {previewPage === "contacto" ? (
        <div className={adminStyles.previewToolbar}>
          <button
            className={adminStyles.viewportBtn}
            type="button"
            onClick={() => startEdit("contact-links")}
          >
            Editar correo y redes
          </button>
        </div>
      ) : null}

      <div className={[adminStyles.livePreview, isNarrow ? adminStyles.livePreviewMobile : ""].filter(Boolean).join(" ")}>
        <div
          ref={stageRef}
          className={adminStyles.livePreviewStage}
          style={{ height: Math.round(previewHeight * scale) }}
        >
          <div
            className={adminStyles.livePreviewScaler}
            style={{
              width: previewWidth,
              height: previewHeight,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              key={`${previewPage}-${previewViewport}`}
              ref={frameRef}
              className={adminStyles.livePreviewFrame}
              title={`Vista previa de ${PAGE_LABEL[previewPage]}`}
              src={PAGE_SRC[previewPage]}
              style={{ width: previewWidth, height: previewHeight }}
              onLoad={() => {
                publishAboutDraft();
                window.setTimeout(publishAboutDraft, 400);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
