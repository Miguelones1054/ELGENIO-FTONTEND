"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import { useOptionalAdminEditor } from "@/components/AdminEditorContext";
import { resolveMediaUrl } from "@/lib/env";
import { compressImageFile } from "@/lib/image-compress";
import styles from "@/styles/admin.module.css";

type MediaKind = "image" | "video";

type CollageSlot = {
  kind: MediaKind | "";
  url: string;
  positionX?: number;
  positionY?: number;
};

type CollageMedia = {
  hero: CollageSlot;
  portrait: CollageSlot;
};

export type CollageSlotKey = "hero" | "portrait";

const emptyMedia = (): CollageMedia => ({
  hero: { kind: "", url: "" },
  portrait: { kind: "", url: "" },
});

const defaultPositions: Record<CollageSlotKey, { x: number; y: number }> = {
  hero: { x: 34, y: 40 },
  portrait: { x: 58, y: 28 },
};

const slotLabels: Record<CollageSlotKey, string> = {
  hero: "Imagen / video de fondo",
  portrait: "Retrato (primer plano)",
};

type CollageMediaManagerProps = {
  embedded?: boolean;
  focusSlot?: CollageSlotKey;
  surface?: "desktop" | "mobile";
  onSaved?: () => void | Promise<void>;
  onCancel?: () => void;
};

export function CollageMediaManager({
  embedded,
  focusSlot,
  surface = "desktop",
  onSaved,
  onCancel,
}: CollageMediaManagerProps) {
  const basePath =
    surface === "mobile"
      ? "/administrative-content/collage-media-mobile"
      : "/administrative-content/collage-media";

  const adminEditor = useOptionalAdminEditor();
  const [media, setMedia] = useState<CollageMedia>(emptyMedia());
  const [positions, setPositions] = useState<Record<CollageSlotKey, { x: number; y: number }>>(defaultPositions);
  const [kinds, setKinds] = useState<Record<CollageSlotKey, MediaKind>>({
    hero: "image",
    portrait: "image",
  });
  const [files, setFiles] = useState<Partial<Record<CollageSlotKey, File>>>({});
  const [urlDrafts, setUrlDrafts] = useState<Partial<Record<CollageSlotKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState<CollageSlotKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slots: CollageSlotKey[] = focusSlot
    ? [focusSlot]
    : surface === "mobile"
      ? ["hero"]
      : ["hero", "portrait"];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<CollageMedia>(basePath, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setMedia({
            hero: {
              kind: data.hero?.kind || "",
              url: data.hero?.url || "",
              positionX: data.hero?.positionX,
              positionY: data.hero?.positionY,
            },
            portrait: {
              kind: data.portrait?.kind || "",
              url: data.portrait?.url || "",
              positionX: data.portrait?.positionX,
              positionY: data.portrait?.positionY,
            },
          });
          setKinds({
            hero: data.hero?.kind === "video" ? "video" : "image",
            portrait: data.portrait?.kind === "video" ? "video" : "image",
          });
          setPositions({
            hero: {
              x: typeof data.hero?.positionX === "number" ? data.hero.positionX : defaultPositions.hero.x,
              y: typeof data.hero?.positionY === "number" ? data.hero.positionY : defaultPositions.hero.y,
            },
            portrait: {
              x: typeof data.portrait?.positionX === "number" ? data.portrait.positionX : defaultPositions.portrait.x,
              y: typeof data.portrait?.positionY === "number" ? data.portrait.positionY : defaultPositions.portrait.y,
            },
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el collage");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [basePath]);

  useEffect(() => {
    if (!adminEditor?.collageLivePosition) return;
    const heroLive = adminEditor.collageLivePosition.hero;
    const portraitLive = adminEditor.collageLivePosition.portrait;

    if (heroLive) {
      setPositions((prev) => (prev.hero.x === heroLive.x && prev.hero.y === heroLive.y ? prev : { ...prev, hero: heroLive }));
    }
    if (portraitLive) {
      setPositions((prev) => (prev.portrait.x === portraitLive.x && prev.portrait.y === portraitLive.y ? prev : { ...prev, portrait: portraitLive }));
    }
  }, [adminEditor?.collageLivePosition]);

  function handlePositionChange(slot: CollageSlotKey, pos: { x: number; y: number }) {
    setPositions((prev) => ({ ...prev, [slot]: pos }));
    adminEditor?.setCollageLivePosition(slot, pos);
  }

  function onFileChange(slot: CollageSlotKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.size > 150 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`El archivo seleccionado (${file.name}) pesa ${sizeMb} MB. El tamaño máximo permitido es 150 MB.`);
      setFiles((current) => ({ ...current, [slot]: undefined }));
      event.target.value = "";
      return;
    }
    setError(null);
    setFiles((current) => ({ ...current, [slot]: file }));
  }

  async function uploadSlot(slot: CollageSlotKey) {
    const file = files[slot];
    if (!file) {
      setError("Selecciona un archivo primero");
      return;
    }

    setBusySlot(slot);
    setError(null);
    setMessage(null);

    try {
      const token = requireAdminToken();
      let fileToUpload = file;
      if (kinds[slot] === "image") {
        fileToUpload = await compressImageFile(file, {
          maxDimension: 2400,
          quality: 0.86,
        });
      }

      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("kind", kinds[slot]);
      formData.append("file", fileToUpload);
      formData.append("positionX", String(positions[slot]?.x ?? defaultPositions[slot].x));
      formData.append("positionY", String(positions[slot]?.y ?? defaultPositions[slot].y));

      const data = await apiUpload<CollageMedia>(`${basePath}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMedia({
        hero: {
          kind: data.hero?.kind || "",
          url: data.hero?.url || "",
          positionX: data.hero?.positionX,
          positionY: data.hero?.positionY,
        },
        portrait: {
          kind: data.portrait?.kind || "",
          url: data.portrait?.url || "",
          positionX: data.portrait?.positionX,
          positionY: data.portrait?.positionY,
        },
      });
      setFiles((current) => {
        const next = { ...current };
        delete next[slot];
        return next;
      });
      setMessage("Medio subido y actualizado con éxito.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo");
    } finally {
      setBusySlot(null);
    }
  }

  async function saveUrlSlot(slot: CollageSlotKey) {
    const url = urlDrafts[slot]?.trim() || "";
    if (!url) {
      setError("Escribe una URL válida");
      return;
    }

    if (!url.startsWith("https://") && !url.startsWith("http://") && !url.startsWith("/")) {
      setError("La URL debe comenzar con https://, http:// o /");
      return;
    }

    setBusySlot(slot);
    setError(null);
    setMessage(null);

    const next: CollageMedia = {
      hero: { ...media.hero },
      portrait: { ...media.portrait },
    };
    next[slot] = {
      kind: kinds[slot],
      url,
      positionX: positions[slot]?.x ?? defaultPositions[slot].x,
      positionY: positions[slot]?.y ?? defaultPositions[slot].y,
    };

    try {
      const token = requireAdminToken();
      const data = await apiFetch<CollageMedia>(basePath, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      });
      setMedia({
        hero: {
          kind: data.hero?.kind || "",
          url: data.hero?.url || "",
          positionX: data.hero?.positionX,
          positionY: data.hero?.positionY,
        },
        portrait: {
          kind: data.portrait?.kind || "",
          url: data.portrait?.url || "",
          positionX: data.portrait?.positionX,
          positionY: data.portrait?.positionY,
        },
      });
      setUrlDrafts((current) => ({ ...current, [slot]: "" }));
      setMessage("URL guardada.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la URL");
    } finally {
      setBusySlot(null);
    }
  }

  async function savePositionSlot(slot: CollageSlotKey) {
    setBusySlot(slot);
    setError(null);
    setMessage(null);

    const pos = positions[slot];
    const next: CollageMedia = {
      hero: { ...media.hero },
      portrait: { ...media.portrait },
    };
    next[slot] = {
      ...next[slot],
      positionX: Math.round(pos.x),
      positionY: Math.round(pos.y),
    };

    try {
      const token = requireAdminToken();
      const data = await apiFetch<CollageMedia>(basePath, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      });
      setMedia({
        hero: {
          kind: data.hero?.kind || "",
          url: data.hero?.url || "",
          positionX: data.hero?.positionX,
          positionY: data.hero?.positionY,
        },
        portrait: {
          kind: data.portrait?.kind || "",
          url: data.portrait?.url || "",
          positionX: data.portrait?.positionX,
          positionY: data.portrait?.positionY,
        },
      });
      setMessage("Posición y encuadre guardados con éxito.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la posición");
    } finally {
      setBusySlot(null);
    }
  }

  async function resetSlot(slot: CollageSlotKey) {
    setBusySlot(slot);
    setError(null);
    setMessage(null);

    const next: CollageMedia = {
      hero: { ...media.hero },
      portrait: { ...media.portrait },
    };
    next[slot] = {
      kind: "",
      url: "",
      positionX: defaultPositions[slot].x,
      positionY: defaultPositions[slot].y,
    };

    try {
      const token = requireAdminToken();
      const data = await apiFetch<CollageMedia>(basePath, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      });
      setMedia({
        hero: {
          kind: data.hero?.kind || "",
          url: data.hero?.url || "",
          positionX: data.hero?.positionX,
          positionY: data.hero?.positionY,
        },
        portrait: {
          kind: data.portrait?.kind || "",
          url: data.portrait?.url || "",
          positionX: data.portrait?.positionX,
          positionY: data.portrait?.positionY,
        },
      });
      setPositions((prev) => ({ ...prev, [slot]: defaultPositions[slot] }));
      adminEditor?.setCollageLivePosition(slot, null);
      setMessage(
        surface === "mobile"
          ? "Sin fondo móvil propio: se usará el de escritorio o el predeterminado."
          : "Restaurado al predeterminado.",
      );
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restaurar");
    } finally {
      setBusySlot(null);
    }
  }

  const body = loading ? (
    <p className={styles.loading}>Cargando collage…</p>
  ) : (
    <div className={styles.form}>
      {slots.map((slot) => {
        const current = media[slot];
        const kind = kinds[slot];
        const busy = busySlot === slot;
        const pos = positions[slot] || defaultPositions[slot];

        return (
          <div key={slot} className={styles.partRow}>
            {!focusSlot ? <h3 className={styles.slotTitle}>{slotLabels[slot]}</h3> : null}

            <div className={styles.kindRow} role="group" aria-label="Tipo de medio">
              <label className={styles.checkField}>
                <input
                  type="radio"
                  name={`kind-${slot}`}
                  checked={kind === "image"}
                  onChange={() => setKinds((c) => ({ ...c, [slot]: "image" }))}
                />
                <span>Foto</span>
              </label>
              <label className={styles.checkField}>
                <input
                  type="radio"
                  name={`kind-${slot}`}
                  checked={kind === "video"}
                  onChange={() => setKinds((c) => ({ ...c, [slot]: "video" }))}
                />
                <span>Video</span>
              </label>
            </div>

            {current.url ? (
              <DraggableMediaViewport
                url={resolveMediaUrl(current.url)}
                kind={current.kind === "video" ? "video" : "image"}
                slot={slot}
                position={pos}
                onChange={(nextPos) => handlePositionChange(slot, nextPos)}
                onSave={() => savePositionSlot(slot)}
                busy={busy}
              />
            ) : (
              <p className={styles.mediaPreviewMeta}>
                {surface === "mobile"
                  ? "Sin fondo móvil propio (usará escritorio o predeterminado)"
                  : "Usando imagen predeterminada del sitio"}
              </p>
            )}

            <label className={styles.field}>
              <span>
                Archivo ({kind === "video" ? "mp4, webm, mov" : "jpg, png, webp, gif"}) · Máx. 150MB
              </span>
              <input
                className={styles.input}
                type="file"
                accept={
                  kind === "video"
                    ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    : "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                }
                onChange={(event) => onFileChange(slot, event)}
              />
              {files[slot] ? (
                <span className={styles.mediaPreviewMeta} style={{ marginTop: 4 }}>
                  Seleccionado: <strong>{files[slot]?.name}</strong> (
                  {((files[slot]?.size || 0) / (1024 * 1024)).toFixed(1)} MB)
                </span>
              ) : null}
            </label>

            <label className={styles.field}>
              <span>O URL directa</span>
              <input
                className={styles.input}
                type="url"
                placeholder="https://... o http://..."
                value={urlDrafts[slot] || ""}
                onChange={(event) =>
                  setUrlDrafts((current) => ({ ...current, [slot]: event.target.value }))
                }
              />
            </label>

            <div className={styles.partActions}>
              <button
                className={styles.submit}
                type="button"
                disabled={busy || !files[slot]}
                onClick={() => uploadSlot(slot)}
              >
                {busy ? "Subiendo…" : "Subir y publicar"}
              </button>
              <button
                className={styles.secondaryAction}
                type="button"
                disabled={busy || !urlDrafts[slot]?.trim()}
                onClick={() => saveUrlSlot(slot)}
              >
                Guardar URL
              </button>
              <button
                className={styles.secondaryAction}
                type="button"
                disabled={busy || !current.url}
                onClick={() => resetSlot(slot)}
              >
                Usar predeterminado
              </button>
            </div>
          </div>
        );
      })}

      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}

      {!embedded ? (
        <div className={styles.actions}>
          <button className={styles.secondaryAction} type="button" onClick={onCancel}>
            Volver
          </button>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <section className={styles.panel} aria-label="Collage del hero">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Collage del hero</h2>
        <p className={styles.panelDescription}>
          Cambia la foto o video del fondo y del retrato en la portada. Puedes arrastrar el medio
          para encuadrar su posición exacta en pantalla.
        </p>
      </div>
      {body}
    </section>
  );
}

function DraggableMediaViewport({
  url,
  kind,
  slot,
  position,
  onChange,
  onSave,
  busy,
}: {
  url: string;
  kind: "image" | "video";
  slot: CollageSlotKey;
  position: { x: number; y: number };
  onChange: (pos: { x: number; y: number }) => void;
  onSave: () => Promise<void>;
  busy?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    width: number;
    height: number;
  } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const { startX, startY, initialX, initialY, width, height } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Arrastrar hacia la izquierda mueve el objeto hacia la izquierda (revela el lado derecho)
    const dxPercent = (deltaX / width) * 100;
    const dyPercent = (deltaY / height) * 100;

    const nextX = Math.round(Math.max(0, Math.min(100, initialX - dxPercent)));
    const nextY = Math.round(Math.max(0, Math.min(100, initialY - dyPercent)));

    onChange({ x: nextX, y: nextY });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      dragRef.current = null;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className={styles.mediaPreview}>
      <div
        ref={containerRef}
        className={[styles.draggableBox, isDragging ? styles.draggableBoxActive : ""].filter(Boolean).join(" ")}
      >
        {kind === "video" ? (
          <video
            src={url}
            className={styles.draggableMedia}
            style={{ objectPosition: `${position.x}% ${position.y}%` }}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className={styles.draggableMedia}
            style={{ objectPosition: `${position.x}% ${position.y}%` }}
          />
        )}

        <div className={styles.draggableCrosshair} />

        <div
          className={[styles.draggableOverlay, isDragging ? styles.draggableOverlayDragging : ""]
            .filter(Boolean)
            .join(" ")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Haz clic y arrastra para mover el video dentro del marco"
        >
          <div className={styles.draggableBadge}>
            <span className={styles.draggableBadgeDot} />
            <span>
              {isDragging ? "Ajustando encuadre…" : "Arrastra para ajustar posición"} · X: {position.x}% · Y: {position.y}%
            </span>
          </div>

          <div className={styles.draggableHint} style={{ opacity: isDragging ? 0.2 : 0.9 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="5 9 2 12 5 15" />
              <polyline points="9 5 12 2 15 5" />
              <polyline points="15 19 12 22 9 19" />
              <polyline points="19 9 22 12 19 15" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
            <span>Haz clic y arrastra en cualquier dirección</span>
          </div>
        </div>
      </div>

      <div className={styles.positionControls}>
        <div className={styles.positionControlsHeader}>
          <span>Encuadre / Posición ({slotLabels[slot]})</span>
          <span className={styles.sliderValue}>
            {position.x}% horiz. · {position.y}% vert.
          </span>
        </div>

        <div className={styles.sliderRow}>
          <span className={styles.sliderLabel}>Horizontal (X)</span>
          <input
            type="range"
            min="0"
            max="100"
            className={styles.sliderInput}
            value={position.x}
            onChange={(e) => onChange({ x: Number(e.target.value), y: position.y })}
          />
          <span className={styles.sliderValue}>{position.x}%</span>
        </div>

        <div className={styles.sliderRow}>
          <span className={styles.sliderLabel}>Vertical (Y)</span>
          <input
            type="range"
            min="0"
            max="100"
            className={styles.sliderInput}
            value={position.y}
            onChange={(e) => onChange({ x: position.x, y: Number(e.target.value) })}
          />
          <span className={styles.sliderValue}>{position.y}%</span>
        </div>

        <div className={styles.positionButtonsRow}>
          <button type="button" className={styles.positionSaveBtn} disabled={busy} onClick={onSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {busy ? "Guardando…" : "Guardar posición"}
          </button>

          <button type="button" className={styles.positionResetBtn} onClick={() => onChange({ x: 50, y: 50 })}>
            Centrar (50% 50%)
          </button>

          <button
            type="button"
            className={styles.positionResetBtn}
            onClick={() => onChange(slot === "hero" ? { x: 34, y: 40 } : { x: 58, y: 28 })}
          >
            Predeterminado
          </button>
        </div>
      </div>
    </div>
  );
}
