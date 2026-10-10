"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  editableLabel,
  useAdminEditor,
  type EditableBlockId,
} from "@/components/AdminEditorContext";
import styles from "@/styles/admin.module.css";

type EditableHotspotProps = {
  id: EditableBlockId;
  className?: string;
  children?: ReactNode;
};

export function EditableHotspot({ id, className, children }: EditableHotspotProps) {
  const {
    selectedId,
    editingId,
    select,
    startEdit,
    previewViewport,
    collageLivePosition,
    setCollageLivePosition,
  } = useAdminEditor();

  const selected = selectedId === id;
  const editing = editingId === id;
  const label = editableLabel(id, previewViewport);

  const isCollageSlot = id === "collage-hero" || id === "collage-portrait";
  const slotKey = id === "collage-hero" ? "hero" : "portrait";
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragCanvasRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    width: number;
    height: number;
  } | null>(null);

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!editing || !isCollageSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentPos = collageLivePosition[slotKey] || (slotKey === "hero" ? { x: 34, y: 40 } : { x: 58, y: 28 });
    dragCanvasRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentPos.x,
      initialY: currentPos.y,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsDraggingCanvas(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    e.stopPropagation();
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragCanvasRef.current || !editing || !isCollageSlot) return;
    const { startX, startY, initialX, initialY, width, height } = dragCanvasRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const dxPercent = (deltaX / width) * 100;
    const dyPercent = (deltaY / height) * 100;

    const nextX = Math.round(Math.max(0, Math.min(100, initialX - dxPercent)));
    const nextY = Math.round(Math.max(0, Math.min(100, initialY - dyPercent)));

    setCollageLivePosition(slotKey, { x: nextX, y: nextY });
    e.stopPropagation();
  }

  function handleCanvasPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragCanvasRef.current) {
      dragCanvasRef.current = null;
      setIsDraggingCanvas(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      e.stopPropagation();
    }
  }

  return (
    <div
      className={[
        styles.hotspot,
        className,
        selected ? styles.hotspotSelected : "",
        editing ? styles.hotspotEditing : "",
        editing && isCollageSlot ? styles.draggableOverlay : "",
        isDraggingCanvas ? styles.draggableOverlayDragging : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      aria-label={`Seleccionar ${label}`}
      aria-pressed={selected}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        select(id);
      }}
      onPointerDown={editing && isCollageSlot ? handleCanvasPointerDown : undefined}
      onPointerMove={editing && isCollageSlot ? handleCanvasPointerMove : undefined}
      onPointerUp={editing && isCollageSlot ? handleCanvasPointerUp : undefined}
      onPointerCancel={editing && isCollageSlot ? handleCanvasPointerUp : undefined}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select(id);
        }
      }}
    >
      {children}
      <div className={styles.hotspotChrome}>
        <span className={styles.hotspotLabel}>
          {editing && isCollageSlot
            ? `✋ Arrastra para mover el video (${label})`
            : label}
        </span>
        {selected && !editing ? (
          <button
            className={styles.hotspotEdit}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startEdit(id);
            }}
          >
            Editar
          </button>
        ) : null}
      </div>
    </div>
  );
}
