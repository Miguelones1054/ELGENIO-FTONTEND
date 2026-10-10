"use client";

import { editableLabel, useAdminEditor } from "@/components/AdminEditorContext";
import { CollageMediaManager } from "@/components/CollageMediaManager";
import { ContactLinksManager } from "@/components/ContactLinksManager";
import { HeroTitleManager } from "@/components/HeroTitleManager";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import { WhatsAppPhoneManager } from "@/components/WhatsAppPhoneManager";
import styles from "@/styles/admin.module.css";

export function AdminEditDrawer() {
  const { editingId, closeEdit } = useAdminEditor();
  const { reload } = useSiteConfig();

  if (!editingId) {
    return null;
  }

  async function handleSaved() {
    await reload();
  }

  return (
    <>
      <button
        className={styles.drawerScrim}
        type="button"
        aria-label="Cerrar editor"
        onClick={closeEdit}
      />
      <aside className={styles.drawer} aria-label="Editor de contenido">
        <header className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerKicker}>Editando</p>
            <h2 className={styles.drawerTitle}>{editableLabel(editingId)}</h2>
          </div>
          <button className={styles.drawerClose} type="button" onClick={closeEdit}>
            Cerrar
          </button>
        </header>
        <div className={styles.drawerBody}>
          {editingId === "hero-title" ? (
            <HeroTitleManager embedded onSaved={handleSaved} onCancel={closeEdit} />
          ) : null}
          {editingId === "whatsapp" ? (
            <WhatsAppPhoneManager embedded onSaved={handleSaved} onCancel={closeEdit} />
          ) : null}
          {editingId === "contact-links" ? (
            <ContactLinksManager embedded onSaved={handleSaved} onCancel={closeEdit} />
          ) : null}
          {editingId === "collage-hero" ? (
            <CollageMediaManager
              embedded
              focusSlot="hero"
              surface="desktop"
              onSaved={handleSaved}
              onCancel={closeEdit}
            />
          ) : null}
          {editingId === "collage-portrait" ? (
            <CollageMediaManager
              embedded
              focusSlot="portrait"
              surface="desktop"
              onSaved={handleSaved}
              onCancel={closeEdit}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}
