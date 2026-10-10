"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import styles from "@/styles/admin.module.css";

export type HeroTextPart = {
  text: string;
  color: string;
  breakAfter?: boolean;
  superscript?: boolean;
};

type HeroTitle = {
  parts: HeroTextPart[];
};

const emptyPart = (): HeroTextPart => ({
  text: "",
  color: "#121212",
  breakAfter: false,
  superscript: false,
});

type HeroTitleManagerProps = {
  embedded?: boolean;
  onSaved?: () => void | Promise<void>;
  onCancel?: () => void;
};

export function HeroTitleManager({ embedded, onSaved, onCancel }: HeroTitleManagerProps) {
  const [parts, setParts] = useState<HeroTextPart[]>([emptyPart()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<HeroTitle>("/administrative-content/hero-title", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setParts(data.parts.length > 0 ? data.parts : [emptyPart()]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el título");
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

  function updatePart(index: number, patch: Partial<HeroTextPart>) {
    setParts((current) => current.map((part, i) => (i === index ? { ...part, ...patch } : part)));
  }

  function addPart() {
    setParts((current) => [...current, emptyPart()]);
  }

  function removePart(index: number) {
    setParts((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload: HeroTitle = {
      parts: parts.map((part) => ({
        text: part.text,
        color: part.color,
        ...(part.breakAfter ? { breakAfter: true } : {}),
        ...(part.superscript ? { superscript: true } : {}),
      })),
    };

    try {
      const token = requireAdminToken();
      const data = await apiFetch<HeroTitle>("/administrative-content/hero-title", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      setParts(data.parts);
      setMessage("Título actualizado.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  const body = loading ? (
    <p className={styles.loading}>Cargando título…</p>
  ) : (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.partsList}>
        {parts.map((part, index) => (
          <div key={index} className={styles.partRow}>
            <label className={styles.field}>
              <span>Texto</span>
              <input
                className={styles.input}
                value={part.text}
                onChange={(event) => updatePart(index, { text: event.target.value })}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Color</span>
              <div className={styles.colorRow}>
                <input
                  className={styles.colorSwatch}
                  type="color"
                  value={part.color}
                  onChange={(event) => updatePart(index, { color: event.target.value })}
                />
                <input
                  className={styles.input}
                  value={part.color}
                  onChange={(event) => updatePart(index, { color: event.target.value })}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  required
                />
              </div>
            </label>

            <label className={styles.checkField}>
              <input
                type="checkbox"
                checked={Boolean(part.breakAfter)}
                onChange={(event) => updatePart(index, { breakAfter: event.target.checked })}
              />
              <span>Salto de línea después</span>
            </label>

            <label className={styles.checkField}>
              <input
                type="checkbox"
                checked={Boolean(part.superscript)}
                onChange={(event) => updatePart(index, { superscript: event.target.checked })}
              />
              <span>Superíndice</span>
            </label>

            <button
              className={styles.partRemove}
              type="button"
              onClick={() => removePart(index)}
              disabled={parts.length <= 1}
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className={styles.partPreview} aria-hidden>
        {parts.map((part, index) => (
          <span key={index} style={{ color: part.color }}>
            {part.superscript ? <sup>{part.text}</sup> : part.text}
            {part.breakAfter ? <br /> : null}
          </span>
        ))}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}

      <div className={styles.partActions}>
        <button className={styles.secondaryAction} type="button" onClick={addPart}>
          Agregar segmento
        </button>
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
      </div>
    </form>
  );

  if (embedded) {
    return body;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Título principal</h2>
        <p className={styles.panelCopy}>Segmentos del texto del hero con color por parte.</p>
      </div>
      {body}
    </section>
  );
}
