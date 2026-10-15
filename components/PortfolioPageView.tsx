"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteConfig, type PortfolioCover, type PortfolioItem, type PortfolioMedia } from "@/components/SiteConfigProvider";
import { resolveMediaUrl } from "@/lib/env";
import { collectionWorks } from "@/lib/portfolio";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/youtube";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/portfolio.module.css";

const page = strings.pages.portafolio;
const ALL = page.allLabel;

function isExternalLink(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith("//") || url.startsWith("mailto:") || url.startsWith("tel:");
}

function cardSize(index: number) {
  return index % 5 < 2 ? "wide" : "regular";
}

function fewWords(text: string, count = 8) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= count) return text;
  return `${words.slice(0, count).join(" ")}…`;
}

export function PortfolioPageView() {
  const { config } = useSiteConfig();
  const [filter, setFilter] = useState(ALL);
  const [activeCollection, setActiveCollection] = useState<PortfolioItem | null>(null);
  const [slide, setSlide] = useState(0);
  const [draftMode, setDraftMode] = useState(false);
  const [draft, setDraft] = useState<{ cover?: PortfolioCover; items?: PortfolioItem[] } | null>(null);

  useEffect(() => {
    const enabled = new URLSearchParams(window.location.search).get("vista") === "borrador";
    setDraftMode(enabled);
    if (!enabled) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "portfolio-draft") return;
      setDraft(event.data.payload ?? null);
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "portfolio-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const items = useMemo(() => {
    const source = draftMode ? draft?.items || [] : config.portfolio || [];
    return source.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.portfolio, draft?.items, draftMode]);

  const categories = useMemo(() => {
    const known = new Set<string>(page.categories);
    for (const item of items) {
      const category = item.category?.trim();
      if (category) known.add(category);
    }
    const extras = [...known].filter((category) => !page.categories.includes(category));
    return [...page.categories, ...extras];
  }, [items]);

  const visibleItems = useMemo(() => {
    if (filter === ALL) return items;
    return items.filter((item) => item.category?.trim().toLowerCase() === filter.toLowerCase());
  }, [filter, items]);

  const cover = draftMode ? draft?.cover : config.portfolioCover;
  const heroImage = cover?.imageUrl
    ? resolveMediaUrl(cover.imageUrl)
    : items[0]?.imageUrl
      ? resolveMediaUrl(items[0].imageUrl)
      : "";
  const headline = cover?.headline?.trim() || page.headline;
  const lead = cover?.description?.trim() || page.copy;
  const headlineSize = cover?.headlineFontSize && cover.headlineFontSize > 0 ? cover.headlineFontSize : 0;
  const headlineStyle = headlineSize
    ? ({
        "--headline-size": `${headlineSize}px`,
        "--headline-size-mobile": `${Math.max(22, Math.round(headlineSize * 0.68))}px`,
      } as CSSProperties)
    : undefined;
  const leadSize = cover?.descriptionFontSize && cover.descriptionFontSize > 0 ? cover.descriptionFontSize : 0;
  const leadStyle = leadSize
    ? ({
        "--lead-size": `${leadSize}px`,
        "--lead-size-mobile": `${Math.max(13, Math.round(leadSize * 0.92))}px`,
      } as CSSProperties)
    : undefined;
  const fadeWidth = Math.min(100, Math.max(0, cover?.fadeWidth ?? 16));
  const fadeCurve: Array<[number, number]> = [
    [0, 0.94],
    [0.2, 0.9],
    [0.4, 0.74],
    [0.58, 0.52],
    [0.74, 0.3],
    [0.88, 0.12],
    [0.96, 0.04],
    [1, 0],
  ];
  const fadeStops = fadeCurve
    .map(([at, alpha]) => `rgba(255, 255, 255, ${alpha}) ${Math.round(fadeWidth * at * 10) / 10}%`)
    .join(", ");
  const fadeStyle = {
    background:
      fadeWidth <= 0 ? "transparent" : `linear-gradient(90deg, ${fadeStops})`,
  };
  const coverPosition = `${cover?.positionX ?? 72}% ${cover?.positionY ?? 50}%`;

  const activeWorks = activeCollection ? collectionWorks(activeCollection) : [];

  function openCollection(item: PortfolioItem) {
    setActiveCollection(item);
    setSlide(0);
  }

  function moveSlide(direction: -1 | 1) {
    if (activeWorks.length < 2) return;
    setSlide((current) => (current + direction + activeWorks.length) % activeWorks.length);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveCollection(null);
      if (event.key === "ArrowRight") moveSlide(1);
      if (event.key === "ArrowLeft") moveSlide(-1);
    }

    if (activeCollection) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeCollection, activeWorks.length]);

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <SiteHeader
          brand={strings.brand}
          nav={strings.nav}
          keywords={strings.header.keywords}
          tone="page"
        />

        <section className={styles.hero} aria-labelledby="portfolio-title">
          <div className={styles.heroVisual}>
            {heroImage ? (
              <img src={heroImage} alt="" className={styles.heroImage} style={{ objectPosition: coverPosition }} />
            ) : (
              <div className={styles.heroFallback} />
            )}
            <div className={styles.heroFade} style={fadeStyle} />
            <div className={styles.heroCopy}>
              <h1 id="portfolio-title" className={styles.headline} style={headlineStyle}>
                {headline}
              </h1>
              <p className={styles.lead} style={leadStyle}>
                {lead}
              </p>
            </div>
          </div>
        </section>

        <div className={styles.wrap}>
        <section className={styles.collection} aria-label="Colección de portafolio">
          <div className={styles.filters}>
            <p className={styles.filterLabel}>{page.filterLabel}</p>
            <div className={styles.filterPills} role="tablist" aria-label={page.filterLabel}>
              <button
                type="button"
                className={filter === ALL ? styles.pillActive : styles.pill}
                onClick={() => setFilter(ALL)}
                aria-pressed={filter === ALL}
              >
                {ALL}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={filter === category ? styles.pillActive : styles.pill}
                  onClick={() => setFilter(category)}
                  aria-pressed={filter === category}
                >
                  {category}
                </button>
              ))}
            </div>
            <button type="button" className={styles.seeAll} onClick={() => setFilter(ALL)}>
              {page.seeAllLabel}
              <Icon id="actions/arrow-right" className={styles.seeAllIcon} />
            </button>
          </div>

          {visibleItems.length === 0 ? (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>{page.emptyTitle}</h2>
              <p className={styles.emptyCopy}>{page.emptyCopy}</p>
              <Link href={page.ctaHref} className={styles.ctaButton}>
                {page.ctaButton}
                <Icon id="actions/arrow-right" className={styles.ctaIcon} />
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {visibleItems.map((item, index) => (
                <CollectionCard
                  key={item.id}
                  item={item}
                  size={cardSize(index)}
                  onOpen={() => openCollection(item)}
                />
              ))}
            </div>
          )}
        </section>

        <section className={styles.services} aria-labelledby="services-title">
          <div className={styles.servicesIntro}>
            <div>
              <h2 id="services-title" className={styles.servicesTitle}>
                {page.servicesTitle}
              </h2>
            </div>
            <p className={styles.servicesCopy}>{page.servicesCopy}</p>
          </div>
          <ul className={styles.serviceList}>
            {page.services.map((service, index) => (
              <li key={service.title} className={styles.serviceItem}>
                <ServiceIcon index={index} />
                <h3>{service.title}</h3>
                <p>{service.copy}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.cta} aria-labelledby="portfolio-cta">
          {heroImage ? <img src={heroImage} alt="" className={styles.ctaImage} /> : null}
          <div className={styles.ctaShade} />
          <div className={styles.ctaContent}>
            <div>
              <h2 id="portfolio-cta" className={styles.ctaTitle}>
                {page.ctaTitle}
              </h2>
              <Link href={page.ctaHref} className={styles.ctaButton}>
                {page.ctaButton}
                <Icon id="actions/arrow-right" className={styles.ctaIcon} />
              </Link>
            </div>
            <ul className={styles.ctaTags}>
              {page.ctaTags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
        </section>
        </div>
      </div>

      {activeCollection ? (
        <CollectionViewer
          item={activeCollection}
          works={activeWorks}
          slide={slide}
          onSlide={setSlide}
          onClose={() => setActiveCollection(null)}
        />
      ) : null}
    </main>
  );
}

function CollectionCard({
  item,
  size,
  onOpen,
}: {
  item: PortfolioItem;
  size: "wide" | "regular";
  onOpen: () => void;
}) {
  const title = item.title?.trim();
  const category = item.category?.trim();
  const description = item.description?.trim();
  const coverRef = useRef<HTMLImageElement>(null);
  const [vertical, setVertical] = useState(false);

  function readCover(image: HTMLImageElement) {
    if (!image.naturalWidth || !image.naturalHeight) return;
    setVertical(image.naturalHeight > image.naturalWidth);
  }

  useEffect(() => {
    const image = coverRef.current;
    if (!image?.complete) {
      setVertical(false);
      return;
    }
    readCover(image);
  }, [item.imageUrl]);

  const cardClass = vertical ? styles.cardVertical : size === "wide" ? styles.cardWide : styles.card;

  return (
    <article className={cardClass}>
      <button
        type="button"
        className={styles.cardButton}
        onClick={onOpen}
        aria-label={title || category || "Ver proyecto"}
      >
        <img
          ref={coverRef}
          src={resolveMediaUrl(item.imageUrl)}
          alt={title || "Proyecto del portafolio"}
          className={styles.cardImage}
          onLoad={(event) => readCover(event.currentTarget)}
        />
        <span className={styles.cardShade} />
        <span className={styles.cardCopy}>
          {category ? <span className={styles.cardCategory}>{category}</span> : null}
          {title ? (
            <span className={styles.cardTitle}>
              {title}
              <span aria-hidden="true"> →</span>
            </span>
          ) : null}
        </span>
      </button>
      {description ? (
        <p className={styles.cardExcerpt}>
          {fewWords(description)}
          <button type="button" className={styles.cardMore} onClick={onOpen}>
            Ver más
          </button>
        </p>
      ) : null}
    </article>
  );
}

function CollectionViewer({
  item,
  works,
  slide,
  onSlide,
  onClose,
}: {
  item: PortfolioItem;
  works: PortfolioMedia[];
  slide: number;
  onSlide: (index: number) => void;
  onClose: () => void;
}) {
  const current = works[slide];
  const description = item.description?.trim() || "";
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const hasButton = Boolean(item.hasButton && item.buttonText?.trim() && item.buttonUrl?.trim());
  const external = hasButton ? isExternalLink(item.buttonUrl!) : false;
  const youtubeId = current?.kind === "video" ? extractYouTubeId(current.url) : null;
  const youtubeEmbed = youtubeId ? getYouTubeEmbedUrl(current.url, true) : null;

  useEffect(() => {
    setDescriptionOpen(false);
  }, [item.id]);

  useEffect(() => {
    setVideoFailed(false);
  }, [current?.id]);

  useEffect(() => {
    const node = descriptionRef.current;
    if (!node) return;

    function measure() {
      const text = descriptionRef.current;
      if (!text) return;
      const narrow = window.matchMedia("(max-width: 900px)").matches;
      if (!narrow || descriptionOpen) {
        if (!narrow) setDescriptionOverflows(false);
        return;
      }

      const probe = document.createElement("div");
      const style = getComputedStyle(text);
      probe.textContent = description;
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.pointerEvents = "none";
      probe.style.width = `${text.clientWidth}px`;
      probe.style.font = style.font;
      probe.style.lineHeight = style.lineHeight;
      text.parentElement?.appendChild(probe);
      const lineHeight = Number.parseFloat(style.lineHeight) || 24;
      setDescriptionOverflows(probe.offsetHeight > lineHeight * 2 + 2);
      probe.remove();
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [description, descriptionOpen]);

  const dialog = (
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || "Colección"}
      onClick={onClose}
    >
      <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Cerrar">
        <Icon id="actions/x" className={styles.closeIcon} />
      </button>
      <div className={styles.viewerPanel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.viewerMain}>
          <div className={styles.viewerCopy}>
            {item.category?.trim() ? <p className={styles.lightboxCategory}>{item.category}</p> : null}
            <div className={styles.viewerTitleRow}>
              <h3 className={styles.lightboxTitle}>{item.title?.trim() || "Colección"}</h3>
              <p className={styles.viewerCount}>
                {works.length === 0 ? "0" : slide + 1} / {works.length}
              </p>
            </div>
            {description ? (
              <p
                ref={descriptionRef}
                className={[
                  styles.lightboxDescription,
                  descriptionOpen ? styles.lightboxDescriptionOpen : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {description}
              </p>
            ) : null}
            {description && (descriptionOverflows || descriptionOpen) ? (
              <button
                type="button"
                className={styles.seeMore}
                onClick={() => setDescriptionOpen((open) => !open)}
              >
                {descriptionOpen ? "Ver menos" : "Ver más"}
              </button>
            ) : null}
          </div>

        <div className={styles.viewerStage}>
          {works.length > 1 ? (
            <button type="button" className={styles.viewerArrow} onClick={() => onSlide((slide - 1 + works.length) % works.length)} aria-label="Trabajo anterior">
              <Icon id="actions/chevron-left" className={styles.viewerArrowIcon} />
            </button>
          ) : null}

          {current ? (
            youtubeEmbed ? (
              <iframe
                key={current.id}
                className={styles.viewerFrame}
                src={youtubeEmbed}
                title={item.title || "Video"}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : current.kind === "video" ? (
              videoFailed ? (
              <p className={styles.viewerEmpty}>No se pudo reproducir este video.</p>
            ) : (
              <video
                key={current.id}
                className={styles.viewerMedia}
                src={resolveMediaUrl(current.url)}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
              />
            )
            ) : (
              <img
                key={current.id}
                className={styles.viewerMedia}
                src={resolveMediaUrl(current.url)}
                alt={item.title || "Trabajo"}
              />
            )
          ) : (
            <p className={styles.viewerEmpty}>Esta colección todavía no tiene trabajos.</p>
          )}

          {works.length > 1 ? (
            <button type="button" className={`${styles.viewerArrow} ${styles.viewerArrowRight}`} onClick={() => onSlide((slide + 1) % works.length)} aria-label="Trabajo siguiente">
              <Icon id="actions/chevron-right" className={styles.viewerArrowIcon} />
            </button>
          ) : null}
        </div>
        </div>

        {works.length > 1 ? (
          <div className={styles.viewerThumbs}>
            {works.map((work, index) => {
              const thumbYoutube = work.kind === "video" ? extractYouTubeId(work.url) : null;
              return (
                <button
                  key={work.id}
                  type="button"
                  className={index === slide ? styles.thumbActive : styles.thumb}
                  onClick={() => onSlide(index)}
                  aria-label={`Trabajo ${index + 1}`}
                >
                  {work.kind === "image" ? (
                    <img src={resolveMediaUrl(work.url)} alt="" />
                  ) : thumbYoutube ? (
                    <img src={`https://i.ytimg.com/vi/${thumbYoutube}/hqdefault.jpg`} alt="" />
                  ) : (
                    <span>Video</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        {hasButton ? (
          <div className={styles.viewerFooter}>
            {external ? (
              <a href={item.buttonUrl} target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
                {item.buttonText}
              </a>
            ) : (
              <Link href={item.buttonUrl!} className={styles.ctaButton}>
                {item.buttonText}
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

function ServiceIcon({ index }: { index: number }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (index === 1) {
    return (
      <svg {...common}>
        <path d="M12 19V9" />
        <path d="M8 12h8" />
        <path d="M7 9h10l-1.2 3.2a2 2 0 0 1-1.9 1.3H10a2 2 0 0 1-1.9-1.3L7 9Z" />
        <circle cx="12" cy="6" r="1.4" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg {...common}>
        <path d="M4 8h3l1.5-2h7L17 8h3v10H4V8Z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    );
  }
  if (index === 3) {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    );
  }
  if (index === 4) {
    return (
      <svg {...common}>
        <path d="M4 19V10" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m10 9 5 3-5 3V9Z" />
    </svg>
  );
}
