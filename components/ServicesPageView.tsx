"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/services.module.css";

const page = strings.pages.servicios;

type CatalogService = {
  referencia: string;
  nombre: string;
  descripcion: string;
  costo: number;
};

type CatalogResponse = {
  count: number;
  servicios: CatalogService[];
};

async function loadCatalog() {
  try {
    return await apiFetch<CatalogResponse>("/servicios");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.toLowerCase().includes("límite")) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, 1600));
    return apiFetch<CatalogResponse>("/servicios");
  }
}

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchScore(service: CatalogService, query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  const name = fold(service.nombre || "");
  const description = fold(service.descripcion || "");
  const code = fold(service.referencia || "");
  const haystack = `${name} ${description} ${code}`;
  if (!words.every((word) => haystack.includes(word))) return 0;
  return words.reduce((score, word) => {
    let next = score;
    if (description.includes(word)) next += 3;
    if (name.includes(word)) next += 2;
    if (code.includes(word)) next += 1;
    return next;
  }, 0);
}

export function ServicesPageView() {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadCatalog()
      .then((data) => {
        if (cancelled) return;
        setServices(data.servicios || []);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const results = useMemo(() => {
    return services
      .map((service) => ({ service, score: matchScore(service, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.service.nombre.localeCompare(b.service.nombre, "es"))
      .map((item) => item.service);
  }, [query, services]);

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <SiteHeader brand={strings.brand} nav={strings.nav} keywords={strings.header.keywords} tone="page" />
        <section className={styles.hero} aria-labelledby="services-title">
          <div className={styles.wrap}>
            <p className={styles.kicker}>El Genio · Catálogo</p>
            <h1 id="services-title" className={styles.headline}>
              {page.headline}
            </h1>
            <p className={styles.lead}>{page.copy}</p>
            <form className={styles.search} role="search" onSubmit={(event) => event.preventDefault()}>
              <label className={styles.searchLabel} htmlFor="service-search">
                {page.searchLabel}
              </label>
              <input
                id="service-search"
                className={styles.searchInput}
                type="search"
                value={query}
                placeholder={page.searchPlaceholder}
                onChange={(event) => setQuery(event.target.value)}
              />
            </form>
          </div>
        </section>

        <section className={styles.results} aria-live="polite">
          <div className={styles.wrap}>
            {status === "loading" ? <p className={styles.status}>{page.loading}</p> : null}
            {status === "error" ? (
              <div className={styles.statusBlock}>
                <p className={styles.status}>{page.error}</p>
                <button className={styles.retry} type="button" onClick={() => setReloadKey((value) => value + 1)}>
                  {page.retry}
                </button>
              </div>
            ) : null}
            {status === "ready" && results.length === 0 ? <p className={styles.status}>{page.empty}</p> : null}
            {status === "ready" && results.length > 0 ? (
              <>
                <p className={styles.count}>
                  {results.length} {results.length === 1 ? "servicio" : "servicios"}
                </p>
                <ul className={styles.grid}>
                  {results.map((service, index) => (
                    <li key={`${service.referencia}-${service.nombre}-${index}`} className={styles.card}>
                      {service.referencia ? <p className={styles.code}>{service.referencia}</p> : null}
                      <h2 className={styles.name}>{service.nombre}</h2>
                      {service.descripcion ? <p className={styles.description}>{service.descripcion}</p> : null}
                      <p className={styles.price}>
                        <span>{page.priceLabel}</span>
                        {currency.format(service.costo || 0)}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
