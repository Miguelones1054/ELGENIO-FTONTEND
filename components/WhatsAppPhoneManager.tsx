"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import styles from "@/styles/admin.module.css";

const COUNTRY_CODE = "57";

type WhatsAppPhoneResponse = {
  phone: string;
};

function toLocalNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith(COUNTRY_CODE) && digits.length > COUNTRY_CODE.length) {
    return digits.slice(COUNTRY_CODE.length);
  }
  return digits;
}

function toFullNumber(local: string) {
  return `${COUNTRY_CODE}${local.replace(/\D/g, "")}`;
}

type WhatsAppPhoneManagerProps = {
  embedded?: boolean;
  onSaved?: () => void | Promise<void>;
  onCancel?: () => void;
};

export function WhatsAppPhoneManager({ embedded, onSaved, onCancel }: WhatsAppPhoneManagerProps) {
  const [localPhone, setLocalPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<WhatsAppPhoneResponse>("/administrative-content/whatsapp-phone", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setLocalPhone(toLocalNumber(data.phone || ""));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el número");
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

    const local = localPhone.replace(/\D/g, "");
    if (local.length < 7) {
      setError("Escribe un número válido");
      setSaving(false);
      return;
    }

    try {
      const token = requireAdminToken();
      const data = await apiFetch<WhatsAppPhoneResponse>("/administrative-content/whatsapp-phone", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: toFullNumber(local) }),
      });
      setLocalPhone(toLocalNumber(data.phone));
      setMessage("Número actualizado.");
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  const body = loading ? (
    <p className={styles.loading}>Cargando número…</p>
  ) : (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span>Número de WhatsApp</span>
        <div className={styles.phoneRow}>
          <span className={styles.phonePrefix}>+57</span>
          <input
            className={styles.phoneInput}
            name="phone"
            inputMode="numeric"
            placeholder="3001112233"
            value={localPhone}
            onChange={(event) => setLocalPhone(event.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
      </label>

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
        <h2 className={styles.panelTitle}>WhatsApp</h2>
        <p className={styles.panelCopy}>Número del botón flotante. Prefijo Colombia fijo.</p>
      </div>
      {body}
    </section>
  );
}
