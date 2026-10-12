"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteConfig, type AboutPage } from "@/components/SiteConfigProvider";
import { resolveMediaUrl } from "@/lib/env";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/about.module.css";

const page = strings.pages.nosotros;

export function AboutPageView({ draft }: { draft?: AboutPage | null }) {
  const { config } = useSiteConfig();
  const [draftMode, setDraftMode] = useState(false);
  const [liveDraft, setLiveDraft] = useState<AboutPage | null>(null);

  useEffect(() => {
    const enabled = new URLSearchParams(window.location.search).get("vista") === "borrador";
    setDraftMode(enabled);
    if (!enabled) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "about-draft") return;
      setLiveDraft(event.data.payload ?? null);
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "about-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const about = draft ?? (draftMode && liveDraft ? liveDraft : config.about);
  const headline = about?.cover?.headline?.trim() || page.headline;
  const description = about?.cover?.description?.trim() || page.copy;
  const image = about?.cover?.imageUrl ? resolveMediaUrl(about.cover.imageUrl) : "";
  const members = (about?.members || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((member) => member.name?.trim());

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <SiteHeader brand={strings.brand} nav={strings.nav} keywords={strings.header.keywords} tone="page" />
        <section className={styles.cover} aria-labelledby="about-title">
          {image ? <img src={image} alt="" className={styles.coverImage} /> : <div className={styles.coverFallback} />}
          <div className={styles.coverShade} />
          <div className={styles.coverCopy}>
            <h1 id="about-title" className={styles.headline}>
              {headline}
            </h1>
            <p className={styles.lead}>{description}</p>
          </div>
        </section>
        <section className={styles.team} aria-label="Equipo">
          <div className={styles.wrap}>
            <h2 className={styles.teamTitle}>El equipo</h2>
            {members.length === 0 ? (
              <p className={styles.empty}>Todavía no hay miembros publicados.</p>
            ) : (
              <ul className={styles.grid}>
                {members.map((member) => (
                  <li key={member.id} className={styles.card}>
                    <div className={styles.portrait}>
                      {member.imageUrl ? (
                        <img src={resolveMediaUrl(member.imageUrl)} alt="" />
                      ) : (
                        <span className={styles.portraitFallback}>{member.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <h3 className={styles.name}>{member.name}</h3>
                    {member.role?.trim() ? <p className={styles.role}>{member.role}</p> : null}
                    {member.description?.trim() ? <p className={styles.bio}>{member.description}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
