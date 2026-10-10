"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import { CONTACT_EMAIL_FIELD, CONTACT_SOCIALS } from "@/lib/contact-links";
import styles from "@/styles/admin.module.css";

type ContactLinks = {
  email: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  linkedin: string;
};

const emptyLinks = (): ContactLinks => ({
  email: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  facebook: "",
  linkedin: "",
});

const FIELDS = [
  CONTACT_EMAIL_FIELD,
  ...CONTACT_SOCIALS.map(({ key, label, icon, placeholder }) => ({
    key,
    label,
    icon,
    placeholder,
  })),
] as const;

type ContactLinksManagerProps = {
  embedded?: boolean;
  onSaved?: () => void | Promise<void>;
  onCancel?: () => void;
};

export function ContactLinksManager({ embedded, onSaved, onCancel }: ContactLinksManagerProps) {
  const [links, setLinks] = useState<ContactLinks>(emptyLinks());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<ContactLinks>("/administrative-content/contact-links", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setLinks({
            email: data.email || "",
            instagram: data.instagram || "",
            tiktok: data.tiktok || "",
            youtube: data.youtube || "",
            facebook: data.facebook || "",
            linkedin: data.linkedin || "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el contacto");
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
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const token = requireAdminToken();
      const data = await apiFetch<ContactLinks>("/administrative-content/contact-links", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(links),
      });
      setLinks({
        email: data.email || "",
        instagram: data.instagram || "",
        tiktok: data.tiktok || "",
        youtube: data.youtube || "",
        facebook: data.facebook || "",
        linkedin: data.linkedin || "",
      });
      setMessage("Contacto actualizado.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  const body = loading ? (
    <p className={styles.loading}>Cargando contacto…</p>
  ) : (
    <form className={styles.form} onSubmit={onSubmit}>
      <p className={styles.panelCopy}>
        Los logos son los mismos de la página Contacto. Solo editas los valores.
      </p>
      {FIELDS.map((field) => (
        <label key={field.key} className={styles.contactField}>
          <span className={styles.contactFieldIcon} aria-hidden>
            <Icon id={field.icon} className={styles.contactFieldGlyph} />
          </span>
          <span className={styles.contactFieldBody}>
            <span className={styles.contactFieldLabel}>{field.label}</span>
            <input
              className={styles.input}
              type={field.key === "email" ? "email" : "text"}
              value={links[field.key]}
              placeholder={field.placeholder}
              onChange={(event) =>
                setLinks((current) => ({ ...current, [field.key]: event.target.value }))
              }
            />
          </span>
        </label>
      ))}

      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}

      <div className={styles.drawerActions}>
        {onCancel ? (
          <button className={styles.secondaryAction} type="button" onClick={onCancel}>
            Cerrar
          </button>
        ) : null}
        <button className={styles.submit} type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );

  if (embedded) {
    return body;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Contacto y redes</h2>
        <p className={styles.panelCopy}>Correo y enlaces sociales de la página Contacto.</p>
      </div>
      {body}
    </section>
  );
}
