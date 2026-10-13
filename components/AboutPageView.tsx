"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteConfig, type AboutMember, type AboutPage } from "@/components/SiteConfigProvider";
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
  const [selected, setSelected] = useState<AboutMember | null>(null);
  const closeMember = useCallback(() => setSelected(null), []);

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
                  <MemberCard key={member.id} member={member} onOpen={setSelected} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      {selected ? <MemberModal member={selected} onClose={closeMember} /> : null}
    </main>
  );
}

function MemberCard({ member, onOpen }: { member: AboutMember; onOpen: (member: AboutMember) => void }) {
  const description = member.description?.trim() || "";
  const bioRef = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const node = bioRef.current;
    if (!node || !description) {
      setOverflows(false);
      return;
    }

    function measure() {
      const text = bioRef.current;
      if (!text) return;
      const style = getComputedStyle(text);
      const probe = document.createElement("div");
      probe.textContent = description;
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.pointerEvents = "none";
      probe.style.width = `${text.clientWidth}px`;
      probe.style.font = style.font;
      probe.style.lineHeight = style.lineHeight;
      text.parentElement?.appendChild(probe);
      const lineHeight = Number.parseFloat(style.lineHeight) || 22;
      setOverflows(probe.scrollHeight > lineHeight * 3 + 1);
      probe.remove();
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [description]);

  return (
    <li className={styles.card}>
      <div className={styles.portrait}>
        {member.imageUrl ? (
          <img src={resolveMediaUrl(member.imageUrl)} alt="" />
        ) : (
          <span className={styles.portraitFallback}>{member.name.slice(0, 1)}</span>
        )}
      </div>
      <h3 className={styles.name}>{member.name}</h3>
      {member.role?.trim() ? <p className={styles.role}>{member.role}</p> : null}
      {description ? (
        <p ref={bioRef} className={styles.bio}>
          {description}
        </p>
      ) : null}
      {overflows ? (
        <button type="button" className={styles.seeMore} onClick={() => onOpen(member)}>
          Ver más
        </button>
      ) : null}
    </li>
  );
}

function MemberModal({ member, onClose }: { member: AboutMember; onClose: () => void }) {
  const description = member.description?.trim() || "";

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.memberModal} role="dialog" aria-modal="true" aria-label={member.name}>
      <button type="button" className={styles.memberClose} onClick={onClose} aria-label="Cerrar">
        <Icon id="actions/x" className={styles.memberCloseIcon} />
      </button>
      <div className={styles.memberPhoto}>
        {member.imageUrl ? (
          <img src={resolveMediaUrl(member.imageUrl)} alt="" />
        ) : (
          <span className={styles.portraitFallback}>{member.name.slice(0, 1)}</span>
        )}
      </div>
      <div className={styles.memberCopy}>
        <h3 className={styles.memberName}>{member.name}</h3>
        {member.role?.trim() ? <p className={styles.role}>{member.role}</p> : null}
        {description ? <p className={styles.memberBio}>{description}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
