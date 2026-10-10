"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PreviewViewport = "desktop" | "mobile";
export type PreviewPage = "inicio" | "contacto";

export type CollagePosition = { x: number; y: number };

export type EditableBlockId =
  | "hero-title"
  | "collage-hero"
  | "collage-portrait"
  | "whatsapp"
  | "contact-links";

type AdminEditorContextValue = {
  previewPage: PreviewPage;
  setPreviewPage: (page: PreviewPage) => void;
  previewViewport: PreviewViewport;
  setPreviewViewport: (viewport: PreviewViewport) => void;
  selectedId: EditableBlockId | null;
  editingId: EditableBlockId | null;
  collageLivePosition: { hero?: CollagePosition; portrait?: CollagePosition };
  setCollageLivePosition: (slot: "hero" | "portrait", pos: CollagePosition | null) => void;
  select: (id: EditableBlockId | null) => void;
  startEdit: (id?: EditableBlockId) => void;
  closeEdit: () => void;
};

const AdminEditorContext = createContext<AdminEditorContextValue | null>(null);

const LABELS: Record<EditableBlockId, string> = {
  "hero-title": "Título principal",
  "collage-hero": "Imagen / video de fondo",
  "collage-portrait": "Retrato (primer plano)",
  whatsapp: "Botón de WhatsApp",
  "contact-links": "Correo y redes sociales",
};

const MOBILE_LABELS: Partial<Record<EditableBlockId, string>> = {
  "collage-hero": "Fondo móvil (foto / video)",
};

const LANDING_BLOCKS: EditableBlockId[] = [
  "hero-title",
  "collage-hero",
  "collage-portrait",
  "whatsapp",
];

export function editableLabel(id: EditableBlockId, viewport: PreviewViewport = "desktop") {
  if (viewport === "mobile" && MOBILE_LABELS[id]) {
    return MOBILE_LABELS[id] as string;
  }
  return LABELS[id];
}

export function AdminEditorProvider({ children }: { children: ReactNode }) {
  const [previewPage, setPreviewPageState] = useState<PreviewPage>("inicio");
  const [previewViewport, setPreviewViewportState] = useState<PreviewViewport>("desktop");
  const [selectedId, setSelectedId] = useState<EditableBlockId | null>(null);
  const [editingId, setEditingId] = useState<EditableBlockId | null>(null);
  const [collageLivePosition, setCollageLivePositionState] = useState<{
    hero?: CollagePosition;
    portrait?: CollagePosition;
  }>({});

  const setCollageLivePosition = useCallback((slot: "hero" | "portrait", pos: CollagePosition | null) => {
    setCollageLivePositionState((prev) => {
      if (!pos) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return { ...prev, [slot]: pos };
    });
  }, []);

  const setPreviewPage = useCallback((page: PreviewPage) => {
    setPreviewPageState(page);
    setSelectedId(null);
    setEditingId(null);
    setCollageLivePositionState({});
  }, []);

  const setPreviewViewport = useCallback((viewport: PreviewViewport) => {
    setPreviewViewportState(viewport);
  }, []);

  const select = useCallback((id: EditableBlockId | null) => {
    setSelectedId(id);
    if (!id) {
      setEditingId(null);
      setCollageLivePositionState({});
    }
  }, []);

  const startEdit = useCallback(
    (id?: EditableBlockId) => {
      setEditingId(() => {
        const next = id ?? selectedId;
        if (next) {
          setSelectedId(next);
        }
        return next;
      });
    },
    [selectedId],
  );

  const closeEdit = useCallback(() => {
    setEditingId(null);
    setCollageLivePositionState({});
  }, []);

  const value = useMemo(
    () => ({
      previewPage,
      setPreviewPage,
      previewViewport,
      setPreviewViewport,
      selectedId,
      editingId,
      collageLivePosition,
      setCollageLivePosition,
      select,
      startEdit,
      closeEdit,
    }),
    [
      previewPage,
      setPreviewPage,
      previewViewport,
      setPreviewViewport,
      selectedId,
      editingId,
      collageLivePosition,
      setCollageLivePosition,
      select,
      startEdit,
      closeEdit,
    ],
  );

  return <AdminEditorContext.Provider value={value}>{children}</AdminEditorContext.Provider>;
}

export function useAdminEditor() {
  const ctx = useContext(AdminEditorContext);
  if (!ctx) {
    throw new Error("useAdminEditor debe usarse dentro de AdminEditorProvider");
  }
  return ctx;
}

export function useOptionalAdminEditor() {
  return useContext(AdminEditorContext);
}

export function isLandingBlock(id: EditableBlockId) {
  return LANDING_BLOCKS.includes(id);
}
