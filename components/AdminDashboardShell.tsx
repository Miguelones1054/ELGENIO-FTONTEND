"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AboutManager } from "@/components/AboutManager";
import { AdminEditDrawer } from "@/components/AdminEditDrawer";
import { AdminEditorProvider, useAdminEditor } from "@/components/AdminEditorContext";
import { AdminPagePreview } from "@/components/AdminPagePreview";
import { ContactRequestsPanel } from "@/components/ContactRequestsPanel";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { CoverVideoManager } from "@/components/CoverVideoManager";
import { PortfolioManager } from "@/components/PortfolioManager";
import { adminSignOut } from "@/lib/admin-auth";
import { getAdminToken, getAdminUser, type AdminSessionUser } from "@/lib/admin-session";
import styles from "@/styles/admin.module.css";

type AdminView = "editor" | "portfolio" | "cover-video" | "email" | "requests";

function EditorChrome({
  user,
  view,
  setView,
}: {
  user: AdminSessionUser;
  view: AdminView;
  setView: (view: AdminView) => void;
}) {
  const router = useRouter();
  const { selectedId, startEdit, previewViewport, setPreviewViewport, previewPage, setPreviewPage } =
    useAdminEditor();

  function onSignOut() {
    adminSignOut();
    router.replace("/administrative-content");
  }

  function getTitle() {
    if (view === "requests") return "Peticiones de usuarios";
    if (view === "email") return "Plantilla de correo automático";
    if (view === "cover-video") return "Video de portada emergente";
    if (view === "portfolio") return "Gestión de Portafolio";
    return "Editor visual";
  }

  return (
    <div className={styles.editor}>
      <header className={styles.editorTopbar}>
        <div className={styles.editorBrand}>
          <p className={styles.kicker}>Administrative content</p>
          <h1 className={styles.editorTitle}>{getTitle()}</h1>
          <p className={styles.dashboardUser}>{user.username}</p>
        </div>

        <div className={styles.editorTopActions}>
          <div className={styles.viewportToggle} role="group" aria-label="Sección del panel">
            <button
              className={[styles.viewportBtn, view === "editor" ? styles.viewportBtnActive : ""]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => setView("editor")}
            >
              Editor
            </button>
            <button
              className={[styles.viewportBtn, view === "portfolio" ? styles.viewportBtnActive : ""]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => setView("portfolio")}
            >
              Portafolio
            </button>
            <button
              className={[styles.viewportBtn, view === "cover-video" ? styles.viewportBtnActive : ""]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => setView("cover-video")}
            >
              Video portada
            </button>
            <button
              className={[styles.viewportBtn, view === "email" ? styles.viewportBtnActive : ""]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => setView("email")}
            >
              Plantilla correo
            </button>
            <button
              className={[styles.viewportBtn, view === "requests" ? styles.viewportBtnActive : ""]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => setView("requests")}
            >
              Peticiones
            </button>
          </div>

          {view === "editor" ? (
            <>
              <div className={styles.viewportToggle} role="group" aria-label="Página a editar">
                <button
                  className={[
                    styles.viewportBtn,
                    previewPage === "inicio" ? styles.viewportBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => setPreviewPage("inicio")}
                >
                  Inicio
                </button>
                <button
                  className={[
                    styles.viewportBtn,
                    previewPage === "portafolio" ? styles.viewportBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => setPreviewPage("portafolio")}
                >
                  Portafolio
                </button>
                <button
                  className={[
                    styles.viewportBtn,
                    previewPage === "nosotros" ? styles.viewportBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => setPreviewPage("nosotros")}
                >
                  Nosotros
                </button>
                <button
                  className={[
                    styles.viewportBtn,
                    previewPage === "contacto" ? styles.viewportBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => setPreviewPage("contacto")}
                >
                  Contacto
                </button>
              </div>

              <div className={styles.viewportToggle} role="group" aria-label="Modo de vista previa">
                <button
                  className={[
                    styles.viewportBtn,
                    previewViewport === "desktop" ? styles.viewportBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => setPreviewViewport("desktop")}
                >
                  Escritorio
                </button>
                <button
                  className={[
                    styles.viewportBtn,
                    previewViewport === "mobile" ? styles.viewportBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => setPreviewViewport("mobile")}
                >
                  Móvil
                </button>
              </div>

              {selectedId ? (
                <button className={styles.editorPrimary} type="button" onClick={() => startEdit()}>
                  Editar selección
                </button>
              ) : (
                <p className={styles.editorGuide}>
                  {previewPage === "contacto"
                    ? "La vista es la página real. El correo y las redes se editan con el botón de la vista previa"
                    : previewPage === "nosotros"
                      ? "Edita la portada y el equipo debajo de la vista previa"
                      : previewPage === "portafolio"
                        ? "La portada y las colecciones se editan en la sección Portafolio"
                        : "Elige un bloque sobre la vista previa para editarlo"}
                </p>
              )}
            </>
          ) : null}

          <button className={styles.signOut} type="button" onClick={onSignOut}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className={styles.editorMain}>
        {view === "editor" ? (
          <>
            <AdminPagePreview />
            {previewPage === "nosotros" ? <AboutManager /> : null}
            <AdminEditDrawer />
          </>
        ) : view === "portfolio" ? (
          <PortfolioManager />
        ) : view === "cover-video" ? (
          <CoverVideoManager />
        ) : view === "email" ? (
          <EmailTemplateManager />
        ) : (
          <ContactRequestsPanel />
        )}
      </div>
    </div>
  );
}

export function AdminDashboardShell() {
  const router = useRouter();
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<AdminView>("editor");

  useEffect(() => {
    const token = getAdminToken();
    const sessionUser = getAdminUser();

    if (!token || !sessionUser) {
      router.replace("/administrative-content");
      return;
    }

    setUser(sessionUser);
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return <p className={styles.loading}>Cargando…</p>;
  }

  return (
    <AdminEditorProvider>
      <EditorChrome user={user} view={view} setView={setView} />
    </AdminEditorProvider>
  );
}
