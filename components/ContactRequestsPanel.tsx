"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import styles from "@/styles/admin.module.css";

type ContactRequest = {
  id: string;
  email: string;
  topic: string;
  clientType: "particular" | "empresa";
  firstName: string;
  lastName: string;
  company: string;
  city: string;
  details: string;
  createdAt: string;
};

const TOPIC_LABELS: Record<string, string> = {
  proyectos: "Proyectos",
  consulta: "Consulta general",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ContactRequestsPanel() {
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<{ items: ContactRequest[] }>(
          "/administrative-content/contact-requests",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled) {
          setItems(data.items || []);
          setSelectedId(data.items?.[0]?.id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las peticiones");
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

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <section className={styles.requestsPanel} aria-label="Peticiones de usuarios">
      <header className={styles.requestsHeader}>
        <div>
          <p className={styles.kicker}>Administrative content</p>
          <h2 className={styles.requestsTitle}>Peticiones de usuarios</h2>
        </div>
        <p className={styles.requestsMeta}>
          {loading ? "Cargando…" : `${items.length} solicitud${items.length === 1 ? "" : "es"}`}
        </p>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className={styles.requestsEmpty}>Aún no hay peticiones enviadas desde Contacto.</p>
      ) : null}

      {items.length > 0 ? (
        <div className={styles.requestsLayout}>
          <ul className={styles.requestsList}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={[
                    styles.requestsItem,
                    selectedId === item.id ? styles.requestsItemActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={styles.requestsItemTitle}>
                    {item.firstName} {item.lastName}
                  </span>
                  <span className={styles.requestsItemMeta}>{item.email}</span>
                  <span className={styles.requestsItemMeta}>{formatDate(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <article className={styles.requestsDetail}>
              <h3 className={styles.requestsDetailTitle}>
                {selected.firstName} {selected.lastName}
              </h3>
              <dl className={styles.requestsFields}>
                <div>
                  <dt>Correo</dt>
                  <dd>
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Tema</dt>
                  <dd>{TOPIC_LABELS[selected.topic] || selected.topic}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>
                    {selected.clientType === "empresa" ? "Empresa" : "Persona particular"}
                  </dd>
                </div>
                {selected.company ? (
                  <div>
                    <dt>Empresa</dt>
                    <dd>{selected.company}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Desde qué ciudad nos escribe</dt>
                  <dd>{selected.city}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatDate(selected.createdAt)}</dd>
                </div>
                <div className={styles.requestsDetailsBlock}>
                  <dt>Qué le gustaría grabar</dt>
                  <dd>{selected.details}</dd>
                </div>
              </dl>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
